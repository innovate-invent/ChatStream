import WebsocketMessageStream from "./WebsocketMessageStream.js";
import {StreamMessage, MessageAction} from "./StreamMessage.js";
import {addSource} from "./chat.js";
import scheduleRenew from "./TokenRenewer.js";


const discordAPIClientId = localStorage.getItem('discordAppID') || "1374597624379867156";
const baseURL = "https://discord.com/api/v10"

enum GatewayOpcodes {
    Dispatch = 0,  // Receive	An event was dispatched.
    Heartbeat = 1,  // Send/Receive	Fired periodically by the client to keep the connection alive.
    Identify = 2,  // Send	Starts a new session during the initial handshake.
    PresenceUpdate = 3,  // 	Send	Update the client's presence.
    VoiceStateUpdate = 4,  // 	Send	Used to join/leave or move between voice channels.
    Resume = 6,  // Send	Resume a previous session that was disconnected.
    Reconnect = 7,  // Receive	You should attempt to reconnect and resume immediately.
    RequestGuildMembers = 8,  // 	Send	Request information about offline guild members in a large guild.
    InvalidSession = 9,  //	Receive	The session has been invalidated. You should reconnect and identify/resume accordingly.
    Hello = 10,  // Receive	Sent immediately after connecting, contains the heartbeat_interval to use.
    HeartbeatACK = 11,  //	Receive	Sent in response to receiving a heartbeat to acknowledge that it has been received.
    RequestSoundBoardSounds = 31,  //	Send	Request information about soundboard sounds in a set of guilds.
}

type EventName =
"READY" |        // Contains the initial state information
"RESUMED" |        // Response to Resume
"APPLICATION_COMMAND_PERMISSIONS_UPDATE" |        // Application command permission was updated
"AUTO_MODERATION_RULE_CREATE" |        // Auto Moderation rule was created
"AUTO_MODERATION_RULE_UPDATE" |        // Auto Moderation rule was updated
"AUTO_MODERATION_RULE_DELETE" |        // Auto Moderation rule was deleted
"AUTO_MODERATION_ACTION_EXECUTION" |        // Auto Moderation rule was triggered and an action was executed (e.g. a message was blocked)
"CHANNEL_CREATE" |        // New guild channel created
"CHANNEL_UPDATE" |        // Channel was updated
"CHANNEL_DELETE" |        // Channel was deleted
"CHANNEL_PINS_UPDATE" |        // Message was pinned or unpinned
"THREAD_CREATE" |        // Thread created, also sent when being added to a private thread
"THREAD_UPDATE" |        // Thread was updated
"THREAD_DELETE" |        // Thread was deleted
"THREAD_LIST_SYNC" |        // Sent when gaining access to a channel, contains all active threads in that channel
"THREAD_MEMBER_UPDATE" |        // Thread member for the current user was updated
"THREAD_MEMBERS_UPDATE" |        // Some user(s) were added to or removed from a thread
"ENTITLEMENT_CREATE" |        // Entitlement was created
"ENTITLEMENT_UPDATE" |        // Entitlement was updated or renewed
"ENTITLEMENT_DELETE" |        // Entitlement was deleted
"GUILD_CREATE" |        // Lazy-load for unavailable guild, guild became available, or user joined a new guild
"GUILD_UPDATE" |        // Guild was updated
"GUILD_DELETE" |        // Guild became unavailable, or user left/was removed from a guild
"GUILD_AUDIT_LOG_ENTRY_CREATE" |        // A guild audit log entry was created
"GUILD_BAN_ADD" |        // User was banned from a guild
"GUILD_BAN_REMOVE" |        // User was unbanned from a guild
"GUILD_EMOJIS_UPDATE" |        // Guild emojis were updated
"GUILD_STICKERS_UPDATE" |        // Guild stickers were updated
"GUILD_INTEGRATIONS_UPDATE" |        // Guild integration was updated
"GUILD_MEMBER_ADD" |        // New user joined a guild
"GUILD_MEMBER_REMOVE" |        // User was removed from a guild
"GUILD_MEMBER_UPDATE" |        // Guild member was updated
"GUILD_MEMBERS_CHUNK" |        // Response to Request Guild Members
"GUILD_ROLE_CREATE" |        // Guild role was created
"GUILD_ROLE_UPDATE" |        // Guild role was updated
"GUILD_ROLE_DELETE" |        // Guild role was deleted
"GUILD_SCHEDULED_EVENT_CREATE" |        // Guild scheduled event was created
"GUILD_SCHEDULED_EVENT_UPDATE" |        // Guild scheduled event was updated
"GUILD_SCHEDULED_EVENT_DELETE" |        // Guild scheduled event was deleted
"GUILD_SCHEDULED_EVENT_USER_ADD" |        // User subscribed to a guild scheduled event
"GUILD_SCHEDULED_EVENT_USER_REMOVE" |        // User unsubscribed from a guild scheduled event
"GUILD_SOUNDBOARD_SOUND_CREATE" |        // Guild soundboard sound was created
"GUILD_SOUNDBOARD_SOUND_UPDATE" |        // Guild soundboard sound was updated
"GUILD_SOUNDBOARD_SOUND_DELETE" |        // Guild soundboard sound was deleted
"GUILD_SOUNDBOARD_SOUNDS_UPDATE" |        // Guild soundboard sounds were updated
"SOUNDBOARD_SOUNDS" |        // Response to Request Soundboard Sounds
"INTEGRATION_CREATE" |        // Guild integration was created
"INTEGRATION_UPDATE" |        // Guild integration was updated
"INTEGRATION_DELETE" |        // Guild integration was deleted
"INTERACTION_CREATE" |        // User used an interaction, such as an Application Command
"INVITE_CREATE" |        // Invite to a channel was created
"INVITE_DELETE" |        // Invite to a channel was deleted
"MESSAGE_CREATE" |        // Message was created
"MESSAGE_UPDATE" |        // Message was edited
"MESSAGE_DELETE" |        // Message was deleted
"MESSAGE_DELETE_BULK" |        // Multiple messages were deleted at once
"MESSAGE_REACTION_ADD" |        // User reacted to a message
"MESSAGE_REACTION_REMOVE" |        // User removed a reaction from a message
"MESSAGE_REACTION_REMOVE_ALL" |        // All reactions were explicitly removed from a message
"MESSAGE_REACTION_REMOVE_EMOJI" |        // All reactions for a given emoji were explicitly removed from a message
"PRESENCE_UPDATE" |        // User was updated
"STAGE_INSTANCE_CREATE" |        // Stage instance was created
"STAGE_INSTANCE_UPDATE" |        // Stage instance was updated
"STAGE_INSTANCE_DELETE" |        // Stage instance was deleted or closed
"SUBSCRIPTION_CREATE" |        // Premium App Subscription was created
"SUBSCRIPTION_UPDATE" |        // Premium App Subscription was updated
"SUBSCRIPTION_DELETE" |        // Premium App Subscription was deleted
"TYPING_START" |        // User started typing in a channel
"USER_UPDATE" |        // Properties about the user changed
"VOICE_CHANNEL_EFFECT_SEND" |        // Someone sent an effect in a voice channel the current user is connected to
"VOICE_STATE_UPDATE" |        // Someone joined, left, or moved a voice channel
"VOICE_SERVER_UPDATE" |        // Guild's voice server was updated
"WEBHOOKS_UPDATE" |        // Guild channel webhook was created, update, or deleted
"MESSAGE_POLL_VOTE_ADD" |        // User voted on a poll
"MESSAGE_POLL_VOTE_REMOVE";        // User removed a vote on a poll

interface Payload {
    op: GatewayOpcodes // 	Gateway opcode, which indicates the payload type
    d?: any // 	Event data
    s?: number // 	Sequence number of event used for resuming sessions and heartbeating
    t?: EventName // 	Event name
}

interface Dispatch extends Payload {
    op: GatewayOpcodes.Dispatch
    s: number
    t: EventName
}

interface PayloadNonDispatch extends Payload {
    op: Exclude<GatewayOpcodes, GatewayOpcodes.Dispatch>
    s: undefined
    t: undefined
}

interface Hello extends PayloadNonDispatch {
    op: GatewayOpcodes.Hello,
    d: {
        heartbeat_interval: number
    }
}

interface InvalidSession extends PayloadNonDispatch {
    op: GatewayOpcodes.InvalidSession,
    d: boolean
}

export function authURL() {
    const state = window.location.hash.replace(/^#/, '');
    return 'https://discord.com/oauth2/authorize?' +
        '&scope=bot+identify+messages.read' + //+gateway.connect' +
        `&permissions=${(1 << 10)}` +
        '&response_type=token' +
        '&prompt=none' +
        `&state=${encodeURIComponent(state)}` +
        `&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname.replace(/[^\/]+$/, ''))}OAuthRedirect.html%3Fsource%3Ddiscord` +
        `&client_id=${discordAPIClientId}`;
}

export function authExpires() {
    return parseInt(localStorage.getItem('discordTokenExpires') || "0");
}

export async function init(renewToken: boolean = false) {
    if (localStorage.getItem('discordBotToken')) return;
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (renewToken) localStorage.removeItem('discordToken');
    if (!localStorage.getItem('discordToken') && (params.has("discord") || renewToken)) {
        window.location.href = authURL();
    }
    console.info("Discord init");
}

function scheduleTokenRenew() {
    if (authExpires()) scheduleRenew(authURL(), authExpires(), scheduleTokenRenew);
}

let source: AsyncGenerator<StreamMessage, void, unknown>;
export async function start() {
    const state = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = localStorage.getItem('discordBotToken') || localStorage.getItem('discordToken');
    let channelId = state.get('discordChannel');
    if (channelId) {
        localStorage.setItem('discordChannel', channelId);
    } else {
        channelId = localStorage.getItem('discordChannel');
    }
    if (source) source.return();
    if (accessToken && channelId) {
        source = await discordChat(channelId);
        addSource(source);
        // scheduleTokenRenew(); TODO re-enable when bot token no longer required
    }
    console.info("Discord start", !!(accessToken && channelId));
    return !!(accessToken && channelId);
}

export default async function discordChat(channelId: string): Promise<AsyncGenerator<StreamMessage, void, unknown>> {
    let seqNumber: number | null = null;
    let sessionId: string;
    let resumeURL: string;
    let heartbeatACK = true;

    async function handleMessage(
        payload: Payload,
        pushMessage: (message: StreamMessage) => void,
        registerHeartbeat: (timeout: number, callback?: () => void) => void,
        connect: (url: string) => Promise<void>,
        reAuth: () => Promise<void>,
        closeAll: (except?: number) => void,
        send: (data: any) => void,
    ) {
        const accessToken = localStorage.getItem('discordBotToken') || localStorage.getItem('discordToken');
        if (!accessToken) {
            closeAll();
            return;
        }
        function heartbeat() {
            if (!heartbeatACK) return false;
            send({
                op: GatewayOpcodes.Heartbeat,
                d: seqNumber,
            });
            heartbeatACK = false;
            return true;
        }

        if (payload.op === GatewayOpcodes.Dispatch) seqNumber = payload.s!;
        switch (payload.op) {
            case GatewayOpcodes.Heartbeat:
                heartbeat();
                console.debug("Discord: Received Heartbeat");
                break;
            case GatewayOpcodes.HeartbeatACK:
                heartbeatACK = true;
                console.debug("Discord: Acknowledged Heartbeat");
                break;
            case GatewayOpcodes.Hello:
                registerHeartbeat(payload.d.heartbeat_interval, heartbeat);
                heartbeat();
                console.info("Discord: Received Hello");
                if (sessionId) {
                    send({
                        op: GatewayOpcodes.Resume,
                        d: {
                            token: accessToken,
                            session_id: sessionId,
                            seq: seqNumber,
                        }
                    })
                } else {
                    send({
                        op: GatewayOpcodes.Identify,
                        d: {
                            token: accessToken,
                            properties: {
                                os: "browser",
                                browser: "ChatStream",
                                device: "ChatStream",
                            },
                            intents: (1 << 15) + (1 << 9),
                        }
                    });
                }
                break;
            case GatewayOpcodes.Reconnect:
                closeAll();
                connect(resumeURL);
                console.info("Discord: Received Reconnect");
                break;
            case GatewayOpcodes.InvalidSession:
                if (!payload.d) {
                    sessionId = '';
                    seqNumber = null;
                }
                connect(resumeURL);
                console.info("Discord: Received InvalidSession");
                break;
            case GatewayOpcodes.Dispatch:
                let action;
                switch (payload.t) {
                    case "READY":
                        sessionId = payload.d.session_id;
                        resumeURL = payload.d.resume_gateway_url;
                        console.info("Discord: Received Ready");
                        break;
                    case "RESUMED":
                        console.info("Discord: Received Resumed");
                        break;
                    case "MESSAGE_CREATE":
                        action = MessageAction.New;
                        // fall-through
                    case "MESSAGE_UPDATE":
                        if (action === undefined) action = MessageAction.Update;
                        // fall-through
                    case "MESSAGE_DELETE":
                        if (action === undefined) action = MessageAction.Delete;
                        if (payload.d.type !== 0 || payload.d.channel_id !== channelId) break;
                        pushMessage({
                            id: payload.d.id,
                            userName: payload.d.author.global_name || payload.d.author.username,
                            message: payload.d.content,
                            timestamp: payload.d.timestamp,
                            source: "discord",
                            action: action,
                        })
                        break;
                    default:
                        break;
                }
                break;
            default:
                break;
        }
    }

    const gateway = (await (await fetch(baseURL + "/gateway")).json()).url;
    return WebsocketMessageStream(gateway, handleMessage);
}