/**
 * Helper that attempts to renew a OAuth token within a hidden iFrame
 * If the renewal takes more than autoRenewTimeout, it is assumed that the OAuth process requires user interaction
 * and redirects the main window to renew the token.
 * @param url The OAuth token renewal URL
 * @param expires The timestamp (in seconds) when the token expires
 * @param callback Called when the token successfully renews
 * @param autoRenewTimeout The timeout in seconds to wait for the OAuth flow to redirect
 */
export default function scheduleRenew(url: string, expires: number, callback: ()=>void, autoRenewTimeout=3) {
    const timeout = expires - (Date.now()/1000) - 30; // Renew 30 seconds before expiry
    return setTimeout(()=>{
        const frame = document.createElement('iframe');
        frame.classList.add('renewFrame');
        document.body.appendChild(frame);
        frame.setAttribute("src", url);
        setTimeout(()=>{
            if (new URL(frame.src).hostname !== window.location.hostname) {
                console.warn(`Token renew iframe at ${frame.src} ${autoRenewTimeout}s after creation!`);
                window.location.href = url;
            }
            frame.remove();
            callback();
        }, autoRenewTimeout * 1000);
    }, timeout * 1000);
}