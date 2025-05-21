import {MessageAction, StreamMessage} from "./StreamMessage.js";
import WebsocketMessageStream from "./WebsocketMessageStream.js";
import {addSource} from "./chat.js";
import scheduleRenew from "./TokenRenewer.js";

const twitchAPIClientId = 'iwxwn4msg9uoq7ec4ulapv33pj1x9c';

interface BaseMessage {
    metadata: {
        message_id: string
        message_type: string
        message_timestamp: string
    },
    payload: {}
}

interface BaseSubscriptionMessage extends BaseMessage {
    metadata: BaseMessage['metadata'] & {
        subscription_type: string
        subscription_version: string
    },
}

interface SessionPayload {
    id: string
    status: string
    connected_at: string
}

interface SubscriptionPayload {
    id: string
    status: string
    type: string
    version: string
    cost: number
    condition: {}
    transport: {
        method: "websocket"
        session_id: string
    }
    created_at: string
}

interface WelcomeMessage extends BaseMessage {
    metadata: BaseMessage['metadata'] & {
        message_type: 'session_welcome'
    }
    payload: {
        session: SessionPayload & {
            keepalive_timeout_seconds: number
            reconnect_url?: string
        }
    }
}

interface KeepaliveMessage extends BaseMessage {
    metadata: BaseMessage['metadata'] & {
        message_type: 'session_keepalive'
    }
}

interface ReconnectMessage extends BaseMessage {
    metadata: BaseMessage['metadata'] & {
        message_type: 'session_reconnect'
    }
    payload: {
        session: SessionPayload & {
            keepalive_timeout_seconds: null
            reconnect_url: string
        }
    }
}

interface RevocationMessage extends BaseSubscriptionMessage {
    metadata: BaseSubscriptionMessage['metadata'] & {
        message_type: 'revocation'
    }
    payload: {
        subscription: SubscriptionPayload
    }
}

interface NotificationMessage extends BaseSubscriptionMessage {
    metadata: BaseSubscriptionMessage['metadata'] & {
        message_type: 'notification'
    }
    payload: {
        subscription: SubscriptionPayload
        event: object
    }
}

interface TokenValidationResponse {
    client_id: string,
    login: string,
    scopes: string[],
    user_id: string,
    expires_in: number
}

interface ChatMessage extends NotificationMessage {
    payload: NotificationMessage['payload'] & {
        event: {
            broadcaster_user_id: string
            broadcaster_user_name: string
            broadcaster_user_login: string
            chatter_user_id: string
            chatter_user_name: string
            chatter_user_login: string
            message_id: string
            message_type: string
            color: string
            channel_points_custom_reward_id?: string
            source_broadcaster_user_id?: string
            source_broadcaster_user_name?: string
            source_broadcaster_user_login?: string
            source_message_id?: string
            set_id: string
            id: string
            info: string
            message: {
                text: string
                fragments: {
                    type: string
                    text: string
                    cheermote?: {
                        prefix: string
                        bits: number
                        tier: number
                    }
                    emote?: {
                        id: string
                        emote_set_id: string
                        owner_id: string
                        format: string[]
                    }
                    mention?: {
                        user_id: string
                        user_name: string
                        user_login: string
                    }
                }[]
            }
            badges: {
                set_id: string
                id: string
                info: string
            }
            cheer?: {
                bits: number
            }
            reply?: {
                parent_message_id: string
                parent_message_body: string
                parent_user_id: string
                parent_user_name: string
                parent_user_login: string
                thread_message_id: string
                thread_user_id: string
                thread_user_name: string
                thread_user_login: string
            }
            source_badges?: {
                set_id: string
                id: string
                info: string
            }
        }
    }
}

interface ChatDelete extends NotificationMessage {
    payload: NotificationMessage['payload'] & {
        event: {
            broadcaster_user_id: string
            broadcaster_user_name: string
            broadcaster_user_login: string
            target_user_id: string
            target_user_name: string
            target_user_login: string
            message_id: string
        }
    }
}

export function authURL() {
    const state = window.location.hash.replace(/^#/, '');
    return 'https://id.twitch.tv/oauth2/authorize?' +
        '&scope=user%3Aread%3Achat' +
        '&response_type=token' +
        `&state=${encodeURIComponent(state)}` +
        `&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname.replace(/[^\/]+$/, ''))}OAuthRedirect.html%3Fsource%3Dtwitch` +
        `&client_id=${twitchAPIClientId}`;
}

export function authExpires() {
    return parseInt(localStorage.getItem('twitchTokenExpires') || "0");
}

export async function init(renewToken = false) {
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (renewToken) localStorage.removeItem('twitchToken');
    if (!localStorage.getItem('twitchToken') && (params.has("twitch") || renewToken)) {
        window.location.href = authURL();
    }
    console.info("Twitch init" + (renewToken ? ", token renewed" : ""));
}

function scheduleTokenRenew() {
    if (authExpires()) scheduleRenew(authURL(), authExpires(), scheduleTokenRenew);
}

let source: AsyncGenerator<StreamMessage, void, unknown>;

export async function start() {
    const accessToken = localStorage.getItem('twitchToken');
    if (source) source.return();
    if (accessToken) {
        source = await twitchChat();
        addSource(source);
        scheduleTokenRenew();
    }
    console.info("Twitch start", !!accessToken);
    return !!accessToken;
}

function heartbeatMissed() {
    console.warn("Twitch: Heartbeat missed, closing socket");
    return false;
}

export default async function twitchChat() {
    const accessToken = localStorage.getItem('twitchToken');
    const validation: TokenValidationResponse = await (await fetch('https://id.twitch.tv/oauth2/validate', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    })).json();
    const broadcasterUserId = validation.user_id;
    let sessionId: string;
    let keepaliveTimeout: number;

    async function handleMessage(message: any,
                                 pushMessage: (message: StreamMessage) => void,
                                 registerHeartbeat: (timeout: number, callback: ()=>boolean) => void,
                                 reconnect: (url: string) => Promise<void>,
                                 reAuth: () => Promise<void>,
                                 closeAll: (except?: number) => void,
    ) {
        const accessToken = localStorage.getItem('twitchToken');
        if (!(message && message.metadata && message.payload)) {
            throw new Error(`Unexpected Twitch message schema ${message}`);
        }
        if (keepaliveTimeout) registerHeartbeat(keepaliveTimeout, heartbeatMissed);  // Reset timeout if active
        switch (message.metadata.message_type) {
            case 'session_welcome':
                console.info("Twitch: Received Welcome");
                if (!sessionId) {
                    sessionId = (message as WelcomeMessage).payload.session.id;
                    fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
                        method: "POST",
                        mode: "cors",
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                            'Client-Id': twitchAPIClientId,
                        },
                        body: JSON.stringify({
                            type: "channel.chat.message",
                            version: "1",
                            condition: {
                                broadcaster_user_id: broadcasterUserId,
                                user_id: broadcasterUserId,
                            },
                            transport: {
                                method: "websocket",
                                session_id: sessionId
                            }
                        })
                    }).then(()=>{
                        console.debug("Twitch: Socket subscribed to new message events");
                    }).catch(err => {
                        console.error(err);
                        closeAll();
                    });
                    fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
                        method: "POST",
                        mode: "cors",
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${accessToken}`,
                            'Client-Id': twitchAPIClientId,
                        },
                        body: JSON.stringify({
                            type: "channel.chat.message_delete",
                            version: "1",
                            condition: {
                                broadcaster_user_id: broadcasterUserId,
                                user_id: broadcasterUserId,
                            },
                            transport: {
                                method: "websocket",
                                session_id: sessionId
                            }
                        })
                    }).then(()=>{
                        console.debug("Twitch: Socket subscribed to deleted message events");
                    }).catch(err => {
                        console.error(err);
                        closeAll();
                    });
                }
                keepaliveTimeout = ((message as WelcomeMessage).payload.session.keepalive_timeout_seconds + 5) * 1000;
                registerHeartbeat(keepaliveTimeout, heartbeatMissed);
                break;
            case 'session_keepalive':
                console.debug("Twitch: Heartbeat Received");
                break;
            case 'session_reconnect':
                reconnect((message as ReconnectMessage).payload.session.reconnect_url);
                console.info("Twitch: Received Reconnect");
                break;
            case 'revocation':
                console.info("Twitch: Received Revocation", (message as RevocationMessage).payload.subscription.status);
                switch ((message as RevocationMessage).payload.subscription.status) {
                    case 'user_removed':
                        break;
                    case 'authorization_revoked':
                        break;
                    case 'version_removed':
                        break;
                }
                break;
            case 'notification':
                let action;
                switch ((message as NotificationMessage).payload.subscription.type) {
                    case 'channel.chat.message_delete':
                        action = MessageAction.Delete;
                    // fall-through
                    case 'channel.chat.message':
                        if (action === undefined) action = MessageAction.New;
                        const messageEvent = (message as ChatMessage).payload.event;
                        pushMessage({
                            timestamp: Date.parse((message as ChatMessage).metadata.message_timestamp),
                            //userBadgeUrl:
                            userName: action === MessageAction.Delete ? (message as ChatDelete).payload.event.target_user_name : messageEvent.chatter_user_name,
                            message: messageEvent.message.text,
                            id: messageEvent.message_id,
                            source: "twitch",
                            action,
                        });
                        break;
                    default:
                        console.warn(`Unexpected Twitch notification type ${(message as NotificationMessage).payload.subscription.type}`);
                        break;
                }
                break;
            default:
                console.warn(`Unknown Twitch message type ${message.metadata.message_type}`);
                break;
        }
    }

    return WebsocketMessageStream("wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30", handleMessage);
}