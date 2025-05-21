import {MessageAction, StreamMessage} from "./StreamMessage.js";
import {addSource} from "./chat.js";
import scheduleRenew from "./TokenRenewer.js";

const liveChatEndpoint = 'https://www.googleapis.com/youtube/v3/liveChat/messages?profileImageSize=16&maxResults=20';
const liveBroadcastsEndpoint = 'https://www.googleapis.com/youtube/v3/liveBroadcasts';
const minimumPollingInterval = 0;

interface LiveChatMessage {
    kind: "youtube#liveChatMessage",
    etag: string,
    id: string,
    snippet: {
        type: string,
        liveChatId: string,
        authorChannelId: string,
        publishedAt: string,
        hasDisplayContent: boolean,
        displayMessage: string,
        fanFundingEventDetails: {
            amountMicros: number,
            currency: string,
            amountDisplayString: string,
            userComment: string
        },
        textMessageDetails: {
            messageText: string
        },
        messageDeletedDetails: {
            deletedMessageId: string
        },
        userBannedDetails: {
            bannedUserDetails: {
                channelId: string,
                channelUrl: string,
                displayName: string,
                profileImageUrl: string
            },
            banType: string,
            banDurationSeconds: number
        },
        memberMilestoneChatDetails: {
            userComment: string,
            memberMonth: number,
            memberLevelName: string
        },
        newSponsorDetails: {
            memberLevelName: string,
            isUpgrade: boolean
        },
        superChatDetails: {
            amountMicros: number,
            currency: string,
            amountDisplayString: string,
            userComment: string,
            tier: number
        },
        superStickerDetails: {
            superStickerMetadata: {
                stickerId: string,
                altText: string,
                language: string
            },
            amountMicros: number,
            currency: string,
            amountDisplayString: string,
            tier: number
        },
        pollDetails: {
            metadata: {
                options: {
                    optionText: string,
                    tally: string,
                },
                questionText: string,
                status: string
            },
        },
        membershipGiftingDetails: {
            giftMembershipsCount: number,
            giftMembershipsLevelName: string
        },
        giftMembershipReceivedDetails: {
            memberLevelName: string,
            gifterChannelId: string,
            associatedMembershipGiftingMessageId: string
        },
    },
    authorDetails: {
        channelId: string,
        channelUrl: string,
        displayName: string,
        profileImageUrl: string,
        isVerified: boolean,
        isChatOwner: boolean,
        isChatSponsor: boolean,
        isChatModerator: boolean
    },
}

interface LiveChatMessageListResponse {
    kind: "youtube#liveChatMessageListResponse"
    etag: string
    nextPageToken: string
    pollingIntervalMillis: number
    offlineAt: string
    pageInfo: {
        totalResults: number
        resultsPerPage: number
    }
    items: LiveChatMessage[]
    activePollItem: LiveChatMessage
}

interface LiveBroadcast {
    kind: "youtube#liveBroadcast",
    etag: string,
    id: string,
    snippet: {
        publishedAt: string,
        channelId: string,
        title: string,
        description: string,
        thumbnails: {
            [key: string]: {
                url: string,
                width: number,
                height: number
            }
        },
        scheduledStartTime: string,
        scheduledEndTime: string,
        actualStartTime: string,
        actualEndTime: string,
        isDefaultBroadcast: boolean,
        liveChatId: string
    },
    status: {
        lifeCycleStatus: string,
        privacyStatus: string,
        recordingStatus: string,
        madeForKids: string,
        selfDeclaredMadeForKids: string,
    },
    contentDetails: {
        boundStreamId: string,
        boundStreamLastUpdateTimeMs: string,
        monitorStream: {
            enableMonitorStream: boolean,
            broadcastStreamDelayMs: number,
            embedHtml: string
        },
        enableEmbed: boolean,
        enableDvr: boolean,
        recordFromStart: boolean,
        enableClosedCaptions: boolean,
        closedCaptionsType: string,
        projection: string,
        enableLowLatency: boolean,
        latencyPreference: boolean,
        enableAutoStart: boolean,
        enableAutoStop: boolean
    },
    statistics: {
        totalChatCount: number
    },
    monetizationDetails: {
        cuepointSchedule: {
            enabled: boolean,
            pauseAdsUntil: string,
            scheduleStrategy: string,
            repeatIntervalSecs: number,
        }
    }
}

interface LiveBroadcastListResponse {
    kind: "youtube#liveBroadcastListResponse",
    etag: string
    nextPageToken: string
    prevPageToken: string
    pageInfo: {
        totalResults: number
        resultsPerPage: number
    },
    items: LiveBroadcast[]
}

interface ErrorResponse {
    error: {
        code: number
        message: string
        errors: {
            domain: string
            message: string
            reason: string
        }[]
    }
}

const googleAPIClientId = '178547291976-iv9nvv4hcg0ru6ern20rjpneqpmjnhtk.apps.googleusercontent.com';

export function authURL() {
    const state = window.location.hash.replace(/^#/, '');
    return 'https://accounts.google.com/o/oauth2/v2/auth?' +
        '&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fyoutube.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile' +
        (localStorage.getItem('youtubeUser') ? `&login_hint=${localStorage.getItem('youtubeUser')}` : '') +
        '&include_granted_scopes=true' +
        '&response_type=token' +
        `&state=${encodeURIComponent(state)}` +
        `&redirect_uri=${encodeURIComponent(window.location.origin + window.location.pathname.replace(/[^\/]+$/, ''))}OAuthRedirect.html%3Fsource%3Dyoutube` +
        `&client_id=${googleAPIClientId}`;
}

export function authExpires() {
    return parseInt(localStorage.getItem('youtubeTokenExpires') || "0");
}

export async function init(renewToken = false) {
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (renewToken) localStorage.removeItem('youtubeToken');
    if (!localStorage.getItem('youtubeToken') && (params.has("youtube") || renewToken)) {
        window.location.href = authURL();
    }
    if (localStorage.getItem('youtubeToken')) {
        const account = await (await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${localStorage.getItem('youtubeToken')}`)).json();
        if (account.sub) localStorage.setItem('youtubeUser', account.sub);
    }
    if (params.has('youtubeBroadcastIndex')) localStorage.setItem('youtubeBroadcastIndex', params.get('youtubeBroadcastIndex')!);
    console.info("Youtube init" + (renewToken ? ", token renewed" : ""));
}

export function clearToken() {
    localStorage.removeItem('youtubeToken');
    localStorage.removeItem('youtubeUser');
}

function scheduleTokenRenew() {
    if (authExpires()) scheduleRenew(authURL(), authExpires(), scheduleTokenRenew);
}

let source: AsyncGenerator<StreamMessage, void, unknown>;

export async function start() {
    const accessToken = localStorage.getItem('youtubeToken');
    if (source) source.return();
    if (accessToken) {
        source = youtubeChat();
        addSource(source);
        scheduleTokenRenew();
    }
    console.info("Youtube start", !!accessToken);
    return !!accessToken;
}

export default async function* youtubeChat(): AsyncGenerator<StreamMessage, void, unknown> {
    let accessToken = localStorage.getItem('youtubeToken');
    let pageToken: string = '';
    const startedAt = Date.now();
    const myLiveBroadcasts: LiveBroadcastListResponse = await (await fetch(`${liveBroadcastsEndpoint}?part=snippet&mine=true`, {
        method: 'GET',
        mode: "cors",
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })).json();
    if (!myLiveBroadcasts.items) {
        console.error("Youtube failed", JSON.stringify(myLiveBroadcasts));
        return;
    }
    const broadcastIndex = parseInt(localStorage.getItem('youtubeBroadcastIndex') || "0");
    const liveChatId = myLiveBroadcasts.items[broadcastIndex < myLiveBroadcasts.items.length ? broadcastIndex : 0].snippet.liveChatId;

    try {
        while (true) {
            accessToken = localStorage.getItem('youtubeToken');
            const messageList: LiveChatMessageListResponse | ErrorResponse = await (await fetch(`${liveChatEndpoint}&liveChatId=${liveChatId}&part=id&part=snippet&part=authorDetails` + (pageToken ? `&pageToken=${pageToken}` : ''), {
                method: 'GET',
                mode: "cors",
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })).json();
            if ('error' in messageList) {
                const error = messageList.error;
                if (error.code === 403 && error.errors.length && ['liveChatEnded', 'rateLimitExceeded'].includes(error.errors[0].reason)) {
                    await new Promise(res => setTimeout(res, 5000));
                    continue;
                }
                throw new Error(error.message, {cause: messageList});
            }
            if (!('items' in messageList)) console.debug(messageList);
            pageToken = messageList.nextPageToken;
            try {
                for (const message of messageList.items) {
                    if (!['textMessageEvent', 'messageDeletedEvent'].includes(message.snippet.type) || Date.parse(message.snippet.publishedAt) < startedAt) continue;
                    yield {
                        timestamp: Date.parse(message.snippet.publishedAt),
                        userName: message.authorDetails.displayName,
                        message: message.snippet.textMessageDetails.messageText,
                        id: message.snippet.type === 'messageDeletedEvent' ? message.snippet.messageDeletedDetails.deletedMessageId : message.id,
                        source: "youtube",
                        action: message.snippet.type === 'messageDeletedEvent' ? MessageAction.Delete : MessageAction.New,
                    };
                }
            } finally {
                // TODO dump remaining messages if return() called
            }
            await new Promise(res => setTimeout(res, messageList.pollingIntervalMillis > minimumPollingInterval ? messageList.pollingIntervalMillis : minimumPollingInterval));
        }
    } finally {
        console.info("Youtube stream closed");
    }
}