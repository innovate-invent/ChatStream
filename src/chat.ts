import {StreamMessage} from "./StreamMessage.js";
import tts, {init as ttsInit} from "./tts.js";

const sources: AsyncGenerator<StreamMessage, void, unknown>[] = [];
let updateSources: (value: unknown)=>void;
let asyncSources = new Promise(resolve => updateSources = resolve);

ttsInit();

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


const codea = "a".codePointAt(0)!;
function nameHue(name: string): number {
    name = name.toLowerCase();
    const first = Math.max(name.codePointAt(0)! - codea, 0);
    const last = Math.max(name.codePointAt(name.length)! - codea, 0);

    return (first ^ last) * (360 / 24) % 360;
}

export default async function start() {
    let lastNode: HTMLElement = document.querySelector('#lastNode')!;
    const template: HTMLTemplateElement = document.querySelector('#chatmessage')!;
    const chat: HTMLElement = document.querySelector('#chat')!;
    let scrollBack = 0;
    let historySize!: number, speed!: number;
    const start = ()=> {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (params.has('clearTokens')) localStorage.clear();
        historySize = parseInt(params.get('historySize') || "2000");
        speed = parseFloat(params.get('speed') || "10");
    }
    window.addEventListener('hashchange', start);
    start();

    let prevTime: DOMHighResTimeStamp;
    function scroll(now: DOMHighResTimeStamp) {
        if (visualViewport && !document.documentElement.matches(':hover')) {
            if (scrollBack) {
                window.scrollBy({behavior: "instant", top: -scrollBack});
                scrollBack = 0;
            }
            prevTime = prevTime || now;
            const maxY = document.documentElement.scrollHeight - visualViewport.height;
            if (speed === 0) {
                const scrollTo = chat.lastElementChild!.getBoundingClientRect().bottom + window.scrollY;
                if (scrollTo > scrollY) window.scrollTo({behavior: "instant", top: scrollTo});
            } else {
                const catchupCoeff = (Math.max(maxY - window.scrollY, 0) * 0.1) + 1;
                const scrollDistance = Math.round(catchupCoeff * speed * ((now - prevTime) / 1000));
                const scrollTo = Math.min(maxY, scrollDistance + window.scrollY);
                if (scrollTo > window.scrollY && scrollTo <= maxY) {
                    window.scrollTo({behavior: "instant", top: scrollTo});
                    prevTime = now;
                }
            }
        } else {
            prevTime = now;
        }
        requestAnimationFrame(scroll);
    }

    let firstMessage = true;
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
        lastNode.classList.add('new');
        const username = lastNode.querySelector('.username') as HTMLElement;
        username.style.setProperty('--namehash', nameHue(message.userName).toString(10));
        username.append(document.createTextNode(message.userName));
        lastNode.querySelector('.message')!.append(document.createTextNode(message.message));
        // Linear search because it will very likely succeed the first or second iteration each time
        while (insertAfter && Number.parseInt(insertAfter.dataset['timestamp']!, 10) > message.timestamp) insertAfter = insertAfter.previousElementSibling as HTMLElement;
        if (insertAfter) {
            insertAfter.insertAdjacentElement('afterend', lastNode);
        } else {
            chat.appendChild(lastNode);
        }
        (lastNode=>setTimeout(()=>lastNode.classList.remove('new')))(lastNode);
        if (speed !== 0) (lastNode=>setTimeout(()=>lastNode.classList.add('old'), Math.max(lastNode.getBoundingClientRect().top, document.documentElement.scrollHeight) * 1000 / speed))(lastNode);
        lastNode.addEventListener('click', tts);

        // Remove messages above history limit
        while (chat.childElementCount > historySize) {
            scrollBack += chat.firstElementChild!.scrollHeight;
            chat.firstElementChild!.remove();
        }

        if (firstMessage) {
            // Start scrolling after the first message is displayed
            requestAnimationFrame(scroll);
            firstMessage = false;
        }
    }
}