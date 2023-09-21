(function () {
    'use strict';

    // import fetch from 'cross-fetch';
    //@ts-ignore
    // import {fetch} from 'whatwg-fetch'
    //TODO : polyfill fetch
    // const apiUrl = process.env.API_SERVER;
    const apiUrl = "http://localhost:8080";
    self.addEventListener('push', async (event) => {
        if (!event.data)
            return;
        let notification = await event.data.json();
        const value = { message_uuid: notification?.options?.data?.messageID };
        await fetch(`${apiUrl}/update-notification-delivery-history`, {
            method: 'POST',
            body: JSON.stringify(value),
            headers: {
                'Content-type': 'application/json; charset=UTF-8',
            },
        });
        self.registration.showNotification(notification.title, notification.options);
        console.log(notification);
    });
    self.addEventListener('message', (event) => {
        // event is an ExtendableMessageEvent object
        console.log(`The client sent me a message: ${event.data}`);
        console.log(event.source);
        event.source.postMessage('push received=======>');
    });
    self.addEventListener('notificationclick', function (event) {
        // Close the notification popout
        event.notification.close();
        let data = event.notification?.data;
        console.log('data', data);
        let action = event.action;
        console.log(event);
        console.log(action);
        if (!event.action) {
            //@ts-ignore
            action = event.notification?.actions?.[0]?.action;
        }
        if (typeof event.action === 'string' && action != null)
            openWindow(event, JSON.parse(action), data);
        else {
            // Get all the Window clients
            const promiseChain = Promise.all([
                clients.matchAll({ type: 'window' }).then((clientsArr) => {
                    // If a Window tab matching the targeted URL already exists, focus that;
                    const hadWindowToFocus = clientsArr.some((windowClient) => windowClient.url === event.notification.data.url ? (windowClient.focus(), true) : false);
                    // Otherwise, open a new tab to the applicable URL and focus it.
                    if (!hadWindowToFocus)
                        clients
                            .openWindow(event.notification.data.url)
                            .then((windowClient) => (windowClient ? windowClient.focus() : null));
                }),
                fetch(`${apiUrl}/update-notification-history`, {
                    method: 'post',
                    body: JSON.stringify({ message_uuid: data.messageID }),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                }),
                fetch(`${apiUrl}/api/v1/p/cmp/wp/analytics?module_uid=${data.module_uid}&push_uid=${data.push_uid}&click=${encodeURIComponent(event.notification.data.url)}`),
            ]);
            event.waitUntil(promiseChain);
        }
    });
    function openWindow(event, action, data) {
        let url = action.url;
        try {
            url = new URL(url).href;
        }
        catch (er) { }
        if (!url)
            return;
        console.log('actionnnnnnnn', action);
        const promiseChain = Promise.all([
            clients.openWindow(url),
            fetch(`${apiUrl}/update-notification-history`, {
                method: 'post',
                body: JSON.stringify({ message_uuid: data.messageID }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8',
                },
            }),
            fetch(`${apiUrl}/api/v1/p/cmp/wp/analytics?module_uid=${action.module_uid}&push_uid=${action.push_uid}&click=${encodeURIComponent(url)}`),
        ]);
        event.waitUntil(promiseChain);
    }
    // (self as ServiceWorkerGlobalScope).addEventListener('notificationclick', function (event) {
    // 	event.notification.close();
    // 	let data = event.notification?.data;
    // 	console.log('data', data);
    // 	let action = event.action;
    // 	console.log(action);
    // 	if (!event.action) {
    // 		//@ts-ignore
    // 		action = event.notification?.actions?.[0]?.action;
    // 	}
    // 	if (typeof event.action === 'string') openWindow(event, JSON.parse(action), data);
    // });
    // async function openWindow(event: NotificationEvent, action: pushNotificationActions, data: any) {
    // 	await fetch(`${apiUrl}/update-notification-history`, {
    // 		method: 'post',
    // 		body: JSON.stringify({ message_uuid: data.messageID }),
    // 		headers: {
    // 			'Content-type': 'application/json; charset=UTF-8',
    // 		},
    // 	});
    // 	let url = action.url;
    // 	try {
    // 		url = new URL(url).href;
    // 	} catch (er) {}
    // 	if (!url) return;
    // 	console.log('actionnnnnnnn', action);
    // 	const promiseChain = Promise.all([
    // 		clients.openWindow(url),
    // 		await fetch(
    // 			`${apiUrl}/api/v1/p/cmp/wp/analytics?module_uid=${action.module_uid}&push_uid=${
    // 				action.push_uid
    // 			}&click=${encodeURIComponent(url)}`,
    // 		).then((ress) => console.log(ress)),
    // 	]);
    // 	event.waitUntil(promiseChain);
    // }

})();
//# sourceMappingURL=serviceWorker.js.map
