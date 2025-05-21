import {MessageAction, StreamMessage} from "./StreamMessage.js";
import {addSource} from "./chat.js";

const _console = {
    error: window.console.error,
    warn: window.console.warn,
    info: window.console.info,
    log: window.console.log,
    debug: window.console.debug,
};

const queue: StreamMessage[] = [];
let queued: (value: void) => void;
let pending = new Promise(resolve => queued = resolve);
let counter = 0;

export async function init(renewToken: boolean = false) {
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (params.has("debug")) {
        const level = params.get("debug") || "debug";
        const keys = Object.keys(_console) as unknown as (keyof typeof _console)[];

        let leveli = parseInt(level);
        if (isNaN(leveli)) leveli = keys.indexOf(level as keyof typeof _console);

        if (leveli < 0 || leveli >= keys.length) {
            const err = {action: MessageAction.New, id: "debug", message: "Invalid log level specified: " + level + ". Must be 0-" + (keys.length - 1).toString() + " or one of " + keys.join(", "), source: "debug", timestamp: Date.now(), userName: "Debug" };
            console.error(err.message);
            queue.push(err);
            queued();
            return;
        }

        for (let i = 0; i <= leveli; i++ ) {
            window.console[keys[i]] = function (...args) {
                _console[keys[i]](...args);
                queue.push({action: MessageAction.New, id: "debug" + counter++, message: args.join("\n"), source: "debug", timestamp: Date.now(), userName: keys[i] });
                queued();
            }
        }

        console.info("Debug init");
    }
}

let source: AsyncGenerator<StreamMessage, void, unknown>;
export async function start() {
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (source) source.return();
    if (params.has("debug")) {
        source = debugChat();
        addSource(source);
        console.info("Debug start");
    }
}

export default async function* debugChat(): AsyncGenerator<StreamMessage, void, unknown> {
    while (true) {
        await pending;
        pending = new Promise(resolve => queued = resolve);
        while (queue.length) yield queue.shift()!;
    }
}
