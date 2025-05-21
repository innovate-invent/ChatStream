import {StreamMessage} from "./StreamMessage.js";

const sources: AsyncGenerator<StreamMessage, void, unknown>[] = [];
let updateSources: (value: unknown)=>void;
let asyncSources = new Promise(resolve => updateSources = resolve);

async function* chatStream(): AsyncGenerator<StreamMessage, void, unknown> {
    const pending: Promise<IteratorResult<StreamMessage>>[] = [];
    const sentinel = Symbol("sentinel") as unknown as IteratorResult<StreamMessage>;
    try {
        console.info("ChatStream start");
        while (true) {
            await asyncSources;
            for (let i = pending.length; pending.length < sources.length; i = pending.push(sources[i].next()));
            const timeout = new Promise(resolve=>setTimeout(resolve, 1000));
            if (!pending.length) {
                await timeout;
                continue;
            }
            await Promise.race([...pending, timeout]);
            for (const [i, promise] of pending.entries()) {
                const winner = await Promise.race([promise, sentinel]);
                if (winner === sentinel) continue;
                if (winner.done) {
                    sources[i] = sources[sources.length - 1];
                    pending[i] = pending[pending.length - 1];
                    sources.length -= 1;
                    pending.length -= 1;
                    console.info("Stream source closed");
                    break;
                }
                if (winner.value) yield winner.value;
                pending[i] = sources[i].next();
            }
        }
    } finally {
        for (const source of sources) source.return();
        console.info("ChatStream stop");
    }
}

export function addSource(source: AsyncGenerator<StreamMessage, void, unknown>) {
    sources.push(source);
    updateSources(null);
}

export default async function start() {
    let lastNode: HTMLElement = document.querySelector('#lastNode')!;
    const template: HTMLTemplateElement = document.querySelector('#chatmessage')!;
    const chat: HTMLElement = document.querySelector('#chat')!;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (params.has('clearTokens')) localStorage.clear();
    const historySize = parseInt(params.get('historySize') || "5000");

    for await (const message of chatStream()) {
        if (!message.message) { // Empty messages are ignored or removed
            const existing = chat.querySelector(`#${message.source}-${message.id}`);
            if (existing) {
                if (existing === lastNode) lastNode = existing.previousElementSibling as HTMLElement;
                existing.remove();
            }
            continue;
        }
        let insertAfter: HTMLElement | null = lastNode;
        lastNode = template.content.firstElementChild!.cloneNode(true) as HTMLElement;
        lastNode.setAttribute('id', `#${message.source}-${message.id}`);
        lastNode.dataset['timestamp'] = `${message.timestamp}`;
        lastNode.dataset['source'] = message.source;
        lastNode.querySelector('.username')!.append(document.createTextNode(message.userName));
        lastNode.querySelector('.message')!.append(document.createTextNode(message.message));
        // Linear search because it will very likely succeed the first or second iteration each time
        while (insertAfter && Number.parseInt(insertAfter.dataset['timestamp']!, 10) > message.timestamp) insertAfter = insertAfter.previousElementSibling as HTMLElement;
        if (insertAfter) {
            insertAfter.insertAdjacentElement('afterend', lastNode);
        } else {
            chat.appendChild(lastNode);
        }
        // TODO TTS via https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis. TTS is only 'onclick' for the message?
        if (!document.body.matches(':hover')) window.scrollTo(0, document.body.scrollHeight);
        while (chat.childElementCount > historySize) chat.firstElementChild!.remove();
    }
}