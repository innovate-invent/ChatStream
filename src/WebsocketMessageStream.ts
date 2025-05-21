import {MessageAction, StreamMessage} from "./StreamMessage.js";

type KeepAliveWebsocket = WebSocket & { keepalive: number };

export function asyncWebSocket(url: string, timeout: number = 5000): Promise<KeepAliveWebsocket> {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url) as KeepAliveWebsocket;
        socket.binaryType = "blob";
        socket.keepalive = 0;
        socket.addEventListener('open', function () {
            resolve(this as KeepAliveWebsocket);
        });
        socket.addEventListener('error', function (event) {
            console.error(event);
            reject(event);
        });
        // socket.addEventListener('close', function (event) {
        //    console.log("socket closed", event)
        // })
    });
}

export type MessageHandler = (
    data: any,
    pushMessage: (message: StreamMessage) => void,
    registerHeartbeat: (timeout: number, callback?: () => void) => void,
    connect: (url: string) => Promise<void>,
    reAuth: () => Promise<void>,
    closeAll: (except?: number) => void,
    send: (data: any) => void,
) => Promise<void>;

export default async function* WebsocketMessageStream(url: string, handleMessage: MessageHandler): AsyncGenerator<StreamMessage, void, unknown> {
    const sockets: KeepAliveWebsocket[] = [];
    const messages: StreamMessage[] = [];
    let messagesPending: (value: unknown) => void = (value) => undefined;
    let messageIds1 = new Set<string>();
    let messageIds2 = new Set<string>();
    const idSwapInterval = setInterval(() => {
        const x = messageIds2;
        messageIds2 = messageIds1;
        messageIds1 = x;
        messageIds1.clear();
    }, 30000);

    function pushMessage(message: StreamMessage) {
        const known = (messageIds1.has(message.id) ||
            messageIds2.has(message.id));
        switch (message.action) {
            case MessageAction.New:
                if (known) return;
                break;
            case MessageAction.Update:
            case MessageAction.Delete:
                if (!known) return;
                break;
        }
        messageIds1.add(message.id);
        messages.push(message);
        messagesPending(null);
    }

    function closeAll(except?: number) {
        sockets.forEach((s, i) => {
            if (i === except) return;
            s.close();
            clearTimeout(s.keepalive);
            s.keepalive = 0;
        });
        if (except !== undefined) {
            sockets[0] = sockets[except];
            sockets.length = 1;
        } else {
            sockets.length = 0;
            console.info("Closing all sockets for", url);
        }
    }

    try {
        async function reAuth() {

        }

        async function connect(url: string) {
            console.debug("Connecting to " + new URL(url).hostname);
            const socket = await asyncWebSocket(url);
            sockets.push(socket);

            function registerHeartbeat(timeout: number, callback?: () => void) {
                if (socket.keepalive) clearTimeout(socket.keepalive);
                socket.keepalive = setTimeout(() => {
                    if (!(callback && callback())) socket.close();
                }, timeout);
            }

            function send(data: any) {
                socket.send(JSON.stringify(data));
            }

            socket.addEventListener("close", ()=> {
                if (sockets.every(s => s.readyState !== WebSocket.OPEN)) {
                    console.debug("All sockets closed for " + new URL(url).hostname);
                    connect(url);
                }
            });

            socket.addEventListener('message', event => handleMessage(JSON.parse(event.data), pushMessage, registerHeartbeat, connect, reAuth, closeAll, send));
        }

        await connect(url);

        while (sockets.some(s => s.readyState === WebSocket.OPEN)) {
            //@ts-ignore
            while (messages.length) yield messages.shift();
            await new Promise(res => {
                messagesPending = res
            });
        }

        //@ts-ignore
        while (messages.length) yield messages.shift();
    } finally {
        closeAll();
        //@ts-ignore
        while (messages.length) yield messages.shift();
        console.info("WebsocketMessageStream closed", url);
    }
}