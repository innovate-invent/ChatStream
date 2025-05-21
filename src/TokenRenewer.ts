/**
 * Helper that attempts to renew a OAuth token within a hidden iFrame
 * If the renewal takes more than autoRenewTimeout, it is assumed that the OAuth process requires user interaction
 * and redirects the main window to renew the token.
 * @param url The OAuth token renewal URL
 * @param expires The timestamp when the token expires
 * @param callback Called when the token successfully renews
 * @param autoRenewTimeout The timeout in seconds to wait for the OAuth flow to redirect
 */
export default function scheduleRenew(url: string, expires: number, callback: ()=>void, autoRenewTimeout=3) {
    const timeout = expires - Date.now() - 30000; // Renew 30 seconds before expiry
    return setTimeout(()=>{
        const frame = document.createElement('iframe');
        frame.style.display = 'none';
        frame.src = url;
        document.body.appendChild(frame);
        setTimeout(()=>{
            if (new URL(frame.src).hostname !== window.location.hostname) window.location.href = url;
            frame.remove();
            callback();
        }, autoRenewTimeout * 1000);
    }, timeout);
}