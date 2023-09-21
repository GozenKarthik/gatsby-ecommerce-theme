(function () {
    'use strict';

    const messages = {
        running: 'GoZen Notify script is running.',
        shuttingDown: 'GoZen Notify script has stopped.',
    };

    var _a;
    class Config {
    }
    _a = Config;
    Object.defineProperty(Config, "gozenScriptTagSelector", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: '#gozen-notify-campaign'
    });
    Object.defineProperty(Config, "campaignIdAttribute", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: 'data-campaign'
    });
    Object.defineProperty(Config, "messages", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: messages
    });
    Object.defineProperty(Config, "apiUrl", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: "http://localhost:8080"
    });
    Object.defineProperty(Config, "renderEngineUrl", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: "http://localhost:3001"
    });
    Object.defineProperty(Config, "appUrl", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: "http://localhost:3000"
    });
    Object.defineProperty(Config, "getCompleteRenderEngineUrl", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: (path) => `${_a.renderEngineUrl}${path}`
    });
    Object.defineProperty(Config, "campaignConfigUrl", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: (campaignId) => `${_a.apiUrl}/notify/v1/${campaignId}`
    });
    Object.defineProperty(Config, "iFrames", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: {
            pushNotificationPopupFrame: 'gozen-notify-push-campaign',
        }
    });
    Object.defineProperty(Config, "frameLocations", {
        enumerable: true,
        configurable: true,
        writable: true,
        value: {
            subscriptionReminderPage: '/push/grand-permission-reminder',
        }
    });

    function findDevice() {
        return window.screen.availWidth > 480 ? 'desktop' : 'desktop';
    }

    class GlobalInstance {
        static get(property) {
            // static get(property: keyof typeof __GOZEN_NOTIFY__) {
            return __GOZEN_NOTIFY__?.[property];
        }
        static set(param) {
            __GOZEN_NOTIFY__ = {
                ...__GOZEN_NOTIFY__,
                ...param,
            };
        }
        static getInstance() {
            return __GOZEN_NOTIFY__;
        }
        static canInitialize() {
            if (GlobalInstance.isInitialized())
                return console.warn('GoZen Notify SDK has already initialized'); // prevent re-initialization
            return true;
        }
        static isInitialized() {
            if (__GOZEN_NOTIFY__?.isInitialized)
                return true;
            return false;
        }
        static register(params) {
            const oldValue = typeof __GOZEN_NOTIFY__ === 'object' ? __GOZEN_NOTIFY__ : {};
            const gozenNotify = {
                ...oldValue,
                ...params,
                isInitialized: true,
            };
            GlobalInstance.set(gozenNotify);
        }
        static getNotificationPopupType() {
            const config = GlobalInstance.get('config');
            if (!config)
                throw new Error('No config found.');
            const device = findDevice();
            const position = config?.settings?.push_notification?.popups?.requestPopup?.appearance?.contentPosition?.[device] ??
                'bottomLeft';
            const popupType = config?.settings?.push_notification?.popups?.requestPopup?.popupType?.[device];
            return { position, popupType };
        }
        static getBlockOverRideType() {
            const config = GlobalInstance.get('config');
            if (!config)
                throw new Error('No config found.');
            const position = config?.settings?.push_notification?.popups?.blockOverride.location;
            return { position };
        }
        static getNotificationSettings() {
            const config = GlobalInstance.get('config');
            if (!config)
                throw new Error('No config found.');
            return config.settings.push_notification;
        }
    }

    class CampaignService {
        static getCampaignIdFromEmbeddedTag() {
            const gozenScriptTags = document.querySelectorAll(Config.gozenScriptTagSelector);
            if (!gozenScriptTags || gozenScriptTags.length === 0)
                throw this.presentCampaignAndScriptVersion([], 'Your GoZen Notify configuration is missing campaign details.');
            const srcSet = new Set();
            const campaignSet = new Set();
            const tagSummery = [];
            [...gozenScriptTags].forEach((tag) => {
                srcSet.add(tag.src);
                campaignSet.add(tag.getAttribute(Config.campaignIdAttribute));
                tagSummery.push({ Script: tag.src, 'Campaign Id': tag.getAttribute(Config.campaignIdAttribute) });
            });
            if (campaignSet.size > 1)
                throw this.presentCampaignAndScriptVersion(tagSummery, 'You have embedded multiple GoZen Notify campaigns in your site.');
            if (srcSet.size > 1)
                throw this.presentCampaignAndScriptVersion(tagSummery, 'You have embedded multiple versions of GoZen Notify campaign tags in your site.');
            const campaignId = gozenScriptTags[0].getAttribute(Config.campaignIdAttribute);
            if (!campaignId || typeof campaignId !== 'string' || campaignId.length <= 10)
                throw new Error('Invalid Campaign id');
            return campaignId;
        }
        static presentCampaignAndScriptVersion(object, errorMessage) {
            console.table(object);
            return new Error(errorMessage);
        }
    }

    const pushNotificationMessageTypes = {
        CAMPAIGN_CONFIGURATION: 'CAMPAIGN_CONFIGURATION',
        POPUP_CONFIGURATION: 'POPUP_CONFIGURATION',
        SHOW_IFRAME: 'SHOW_IFRAME',
        SHOW_TOAST_OR_MODAL_POPUP_IFRAME: 'SHOW_TOAST_OR_MODAL_POPUP_IFRAME',
        NOTIFICATION_PERMISSION_GRANTED: 'NOTIFICATION_PERMISSION_GRANTED',
        NOTIFICATION_REQUEST_DENIED: 'NOTIFICATION_REQUEST_DENIED',
        REDIRECT: 'REDIRECT',
        SHOW_BELL_ICON_IFRAME: 'SHOW_BELL_ICON_IFRAME',
        SHOW_BELL_POPUP_IFRAME: 'SHOW_BELL_POPUP_IFRAME',
        SHOW_BLOCKOVERRIDE_IFRAME: 'SHOW_BLOCKOVERRIDE_IFRAME',
        CREATE_SUBSCRIBER: 'CREATE_SUBSCRIBER',
        UPDATE_SUBSCRIBER: 'UPDATE_SUBSCRIBER',
    };

    const createCORSRequest = function (type, url) {
        var xhr = new XMLHttpRequest();
        //@ts-ignore
        if (!('withCredentials' in xhr) && 'undefined' != typeof XDomainRequest) {
            //@ts-ignore
            xhr = new XDomainRequest();
            xhr.open(type, url);
            xhr.setRequestHeader('cache-control', 'no-cache, must-revalidate, post-check=0, pre-check=0'),
                xhr.setRequestHeader('cache-control', 'max-age=0'),
                xhr.setRequestHeader('expires', '0'),
                xhr.setRequestHeader('expires', 'Tue, 01 Jan 1980 1:00:00 GMT'),
                xhr.setRequestHeader('pragma', 'no-cache');
            return xhr;
        }
        xhr.open(type, url, !0);
        return xhr;
    };
    const getAjax = function (url, cb) {
        var request = createCORSRequest('GET', url);
        if (!request)
            throw 'unable to call server';
        request.onload = function () {
            var res = request.responseText;
            cb(res, request);
        };
        request.onerror = function () {
            cb('[]', request);
        };
        request.send();
    };
    function getReferrer() {
        let referrer;
        try {
            parent && parent.document && parent.document.location && (referrer = parent.document.location.href);
        }
        catch (o) {
            referrer = document.referrer;
        }
        return referrer;
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    let getRandomValues;
    const rnds8 = new Uint8Array(16);
    function rng() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);

        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }

      return getRandomValues(rnds8);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    const byteToHex = [];

    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).slice(1));
    }

    function unsafeStringify(arr, offset = 0) {
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
    }

    const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    var native = {
      randomUUID
    };

    function v4(options, buf, offset) {
      if (native.randomUUID && !buf && !options) {
        return native.randomUUID();
      }

      options = options || {};
      const rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (let i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return unsafeStringify(rnds);
    }

    // import { getAjax, getCookie, getReferrer, parseJson, sendAjax, setCookie } from '../helper/helper';
    // const automationServerUrl = "http://localhost:9000";
    // const apiServerUrl = process.env.API_SERVER;
    // const cdnUrl = "http://localhost:7000";
    function fnBrowserDetect() {
        let userAgent = navigator.userAgent;
        let browserName;
        if (userAgent.match(/chrome|chromium|crios/i)) {
            browserName = 'chrome';
            return browserName;
        }
        else if (userAgent.match(/firefox|fxios/i)) {
            browserName = 'firefox';
            return browserName;
        }
        else if (userAgent.match(/safari/i)) {
            browserName = 'safari';
            return browserName;
        }
        else if (userAgent.match(/opr\//i)) {
            browserName = 'opera';
            return browserName;
        }
        else if (userAgent.match(/edg/i)) {
            browserName = 'edge';
            return browserName;
        }
        else {
            browserName = 'No browser detection';
            return browserName;
        }
    }
    function osfunction() {
        let os = navigator.userAgent;
        let finalOs = '';
        if (os.search('Windows') !== -1) {
            finalOs = 'Windows';
            return finalOs;
        }
        else if (os.search('Mac') !== -1) {
            finalOs = 'MacOS';
            return finalOs;
        }
        else if (os.search('X11') !== -1 && !(os.search('Linux') !== -1)) {
            finalOs = 'UNIX';
            return finalOs;
        }
        else if (os.search('Linux') !== -1 && os.search('X11') !== -1) {
            finalOs = 'Linux';
            return finalOs;
        }
    }
    const userAction = async () => {
        let url = 'https://location.v47.workers.dev/';
        let result;
        let options = {
            method: 'GET',
            headers: { Accept: '*/*' },
        };
        await fetch(url, options)
            .then((res) => (result = res.json()))
            .catch((err) => console.error('error:' + err));
        return result;
    };
    const mobileAndTabletCheck = function () {
        let check = false;
        (function (a) {
            if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) ||
                /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4)))
                check = true;
            //@ts-ignore
        })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    };
    const setGzLead = async function (data) {
        let city;
        let timezone;
        await userAction().then((res) => {
            city = res.city;
            timezone = res.timezone;
        });
        const subscribeStatus = getPushNotificationPermissionStatus();
        getAjax('https://1.1.1.1/cdn-cgi/trace', function (r) {
            let cld = r
                .trim()
                .split('\n')
                .map((e) => e.split('='));
            cld = Object.fromEntries(cld);
            const workspace_id = JSON.parse(localStorage.getItem('workspace_id'));
            const pay = Object.assign({}, data, {
                referrer: getReferrer(),
                ip: cld.ip,
                country: cld.loc,
                //@ts-ignore
                language: navigator.language || navigator?.userLanguage,
                browser: fnBrowserDetect(),
                device: osfunction(),
                city: city,
                timezone: timezone,
                platform: mobileAndTabletCheck() ? 'mobile' : 'pc',
                workspace_id: workspace_id,
                status: subscribeStatus,
            });
            const campaignId = CampaignService.getCampaignIdFromEmbeddedTag();
            sendMessageToFrame({
                iframe: Config.iFrames.pushNotificationPopupFrame,
                message: {
                    data: {
                        location: '/create-subscriber',
                        subscription: { ...pay, workspace_uuid: campaignId, lead_uid: v4(), config: {} },
                    },
                    type: pushNotificationMessageTypes.CREATE_SUBSCRIBER,
                },
            });
        });
        return 'PROCESSING';
    };
    const updateGzLead = function (data) {
        getAjax('https://1.1.1.1/cdn-cgi/trace', function (r) {
            let cld = r
                .trim()
                .split('\n')
                .map((e) => e.split('='));
            cld = Object.fromEntries(cld);
            const subscribeStatus = getPushNotificationPermissionStatus();
            // const pay = Object.assign({}, data, {
            // 	referrer: getReferrer(),
            // 	ip: cld.ip,
            // 	country: cld.loc,
            // 	//@ts-ignore
            // 	language: navigator.language || navigator?.userLanguage,
            // 	browser: fnBrowserDetect(),
            // 	device: osfunction(),
            // });
            sendMessageToFrame({
                iframe: Config.iFrames.pushNotificationPopupFrame,
                message: {
                    data: {
                        location: '/update-subscriber',
                        subscription: { ...data, status: subscribeStatus },
                    },
                    type: pushNotificationMessageTypes.UPDATE_SUBSCRIBER,
                },
            });
        });
        return 'PROCESSING';
    };

    class Logger {
        static isDebuggingEnabled() {
            return Boolean(GlobalInstance.get('debug'));
        }
        static log(message, ...optionalParams) {
            if (this.isDebuggingEnabled())
                console.log(message, ...optionalParams);
        }
        static warn(message, ...optionalParams) {
            if (this.isDebuggingEnabled())
                console.warn(message, ...optionalParams);
        }
        static error(message, ...optionalParams) {
            if (this.isDebuggingEnabled())
                console.error(message, ...optionalParams);
        }
        static table(tabularData, properties) {
            if (this.isDebuggingEnabled())
                console.table(tabularData, properties);
        }
        static prettyPrint(message) {
            const styles = [
                'font-size:12px',
                'color:rgb(37 99 235)',
                'padding:0.25rem 0.5rem',
                //"text-shadow:0 1px 0 #ccc,0 2px 0 #c9c9c9,0 3px 0 #bbb,0 4px 0 #b9b9b9",//,0 5px 0 #aaa,0 6px 1px rgba(0,0,0,.1),0 0 5px rgba(0,0,0,.1),0 1px 3px rgba(0,0,0,.3),0 3px 5px rgba(0,0,0,.2),0 5px 10px rgba(0,0,0,.25),0 10px 10px rgba(0,0,0,.2),0 20px 20px rgba(0,0,0,.15)
            ].join(';');
            console.log(`%c${message}`, styles);
        }
    }

    // import { redirectFrame } from './messageBroker';
    // const VAPID_PUBLIC_KEY: string = "BG8d6xZH0KPJ0Yjs89PoLT6e_NtGBvzx_IcdyGItVyP-Eft1zH7TPQJsXubwOrK4oWMCp7AIQLxPwHEtCI9JHzQ"!;
    const swName = "sw";
    const serviceWorkerRegistration = async () => {
        try {
            //TODO check service worker is already installed or not.
            //TODO return a promise when the installation completes.
            //TODO add a method for check and update service worker
            const serviceWorker = await getSW();
            if (serviceWorker)
                return serviceWorker.update();
            const serviceWorkerRegistration = await registerSW();
            listenForStateChanges(serviceWorkerRegistration, serviceWorkerStateChangeCallBack);
            // navigator.serviceWorker.addEventListener('message', function handler(event) {
            // 	console.log('first');
            // 	console.log(event.data);
            // });
            return serviceWorkerRegistration;
        }
        catch (err) {
            console.log('Service worker installation failed');
            console.error(err);
            throw err;
        }
    };
    const serviceWorkerStateChangeCallBack = async (event) => {
        const activeStatus = await isServiceWorkerActive(event);
        if (activeStatus)
            return 'active';
    };
    function isServiceWorkerActive(event) {
        return new Promise((resolve, reject) => {
            if (!event?.target || event.target.state === 'activated')
                return resolve('service worker is fully active and ready.');
            reject(`Service worker is not active yet current state : ${event?.target?.state}`);
        });
    }
    const subscribeToPush = async () => {
        try {
            const serviceWorker = await getSW();
            if (!serviceWorker)
                throw 'No service worker found!';
            const VAPID_PUBLIC_KEY = localStorage.getItem('vapidPublicKey');
            if (!VAPID_PUBLIC_KEY)
                throw 'Vapid public key not found';
            const publicKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
            const subscription = await serviceWorker.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey,
            });
            // redirectFrame({ iframe: Config.iFrames.pushNotificationPopupFrame, location: `/bell-configuration` });
            const local_tenant_id = localStorage.getItem('tenant_id');
            const local_lead_id = localStorage.getItem('lead_id');
            if (local_tenant_id == null || local_lead_id == null) {
                setGzLead({ vapid_config: subscription.toJSON() });
            }
            else {
                var tenant_id, lead_id;
                if (local_tenant_id && local_lead_id) {
                    tenant_id = JSON.parse(local_tenant_id);
                    lead_id = JSON.parse(local_lead_id);
                }
                updateGzLead({ vapid_config: subscription.toJSON(), tenant_id: tenant_id, lead_id: lead_id });
            }
        }
        catch (err) {
            console.log(err);
        }
    };
    const updateSubscriber = async () => {
        try {
            const serviceWorker = await getSW();
            if (!serviceWorker)
                throw 'No service worker found!';
            const existingSubscription = await serviceWorker.pushManager.getSubscription();
            const localKey = localStorage.getItem('gz_Subscription');
            const local_tenant_id = localStorage.getItem('tenant_id');
            const local_lead_id = localStorage.getItem('lead_id');
            var localVapidConfigKey, tenant_id, lead_id;
            localVapidConfigKey = JSON.parse(localKey);
            tenant_id = JSON.parse(local_tenant_id);
            lead_id = JSON.parse(local_lead_id);
            if (JSON.stringify(existingSubscription?.toJSON()) === JSON.stringify(localVapidConfigKey))
                return;
            const VAPID_PUBLIC_KEY = localStorage.getItem('vapidPublicKey');
            if (!VAPID_PUBLIC_KEY)
                throw 'Vapid public key not found';
            const publicKey = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
            const subscription = await serviceWorker.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey,
            });
            updateGzLead({ vapid_config: subscription.toJSON(), tenant_id: tenant_id, lead_id: lead_id });
        }
        catch (err) {
            console.log(err);
        }
    };
    const getSW = () => {
        console.log('getting service worker', `/${swName}`);
        return navigator.serviceWorker.getRegistration(`/${swName}`);
    };
    const listenForStateChanges = (swRegistration, callback) => {
        if (swRegistration.installing)
            swRegistration.installing.addEventListener('statechange', callback);
        if (swRegistration.waiting)
            swRegistration.waiting.addEventListener('statechange', callback);
        swRegistration.addEventListener('updatefound', function () {
            if (!swRegistration.installing)
                return;
            swRegistration.installing.addEventListener('statechange', callback);
        });
    };
    const registerSW = () => {
        return navigator.serviceWorker.register(`/${swName}.js`, {
            scope: `/${swName}`,
        });
    };
    const isSupported = () => {
        if (!('serviceWorker' in navigator))
            return false;
        if (!('PushManager' in window))
            return false;
        return true;
    };
    function urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    const getPushNotificationPermissionStatus = () => {
        return window.Notification.permission;
    };
    function registerServiceWorker() {
        serviceWorkerRegistration()
            .then((serviceWorkerRegistration) => Logger.log(serviceWorkerRegistration))
            .catch((err) => Logger.error(err));
    }

    function createAndAppendIframe(params) {
        const { src, id = '', styles = '' } = params;
        const IFRAME_STYLE = 'position:fixed;z-index:9999999;right:20px;bottom:20px;border:none;display:none;' + styles;
        const hasExist = document.getElementById(id);
        const frame = hasExist ? hasExist : document.createElement('iframe');
        frame.src = src;
        frame.id = id;
        frame.scrolling = 'no';
        frame.setAttribute('style', IFRAME_STYLE);
        document.body.appendChild(frame);
        return frame;
    }
    function setStyle(params) {
        const { id, style } = params;
        const element = document.getElementById(id);
        if (!element)
            throw new Error('Element not found');
        element.setAttribute('style', style);
    }
    ({
        width: document.body.style.width,
        height: document.body.style.height,
        overflow: document.body.style.overflow,
    });

    async function runPushNotificationCampaign(options) {
        try {
            if (!isSupported())
                return console.warn('GoZen Push Not Supported in this browser.');
            if (!options)
                throw new Error('Push notification settings are missing in the config.');
            const isFeatureEnabled = options?.enabled;
            if (!isFeatureEnabled)
                return Logger.warn('push notification feature is not enabled yet, you can enable it from settings.');
            const { popups: settings } = options;
            const permissionStatus = getPushNotificationPermissionStatus();
            Logger.table({ permissionStatus });
            //TODO check user already approved for receiving notifications
            //TODO get subscription url on each page load and  if endpoint changed send again to server
            //TODO update service worker
            if (permissionStatus === 'denied')
                return showBlockOverridePopup();
            if (permissionStatus === 'granted')
                return showBellConfiguration();
            showPermissionRequestingPopup(settings.requestPopup);
        }
        catch (err) {
            console.error(err); // TODO manage debugging
        }
    }
    async function handleNativePopupClose() {
        console.log({ handlePermissionPromptClose: 'closed prompt' });
        //TODO timing which the popup shows is odd so show it immediately when user closes the prompt
        // window.addEventListener('blur', () => console.log('Blur'));
        // window.addEventListener('focus', () => console.log('Focus'));
        redirectFrame({
            iframe: Config.iFrames.pushNotificationPopupFrame,
            location: Config.frameLocations.subscriptionReminderPage,
        });
        updatePopupStyle({ id: Config.iFrames.pushNotificationPopupFrame, type: 'FULL_SCREEN' });
    }
    async function showBlockOverridePopup() {
        const settings = GlobalInstance.getNotificationSettings();
        const options = settings?.popups?.blockOverride;
        console.log('block override settings ===>', settings?.popups?.blockOverride);
        if (!options?.enabled)
            return; //TODO
        const local_tenant_id = localStorage.getItem('tenant_id');
        const local_lead_id = localStorage.getItem('lead_id');
        const local_status = localStorage.getItem('sub_status');
        const permissionStatus = getPushNotificationPermissionStatus();
        const tenant_id = JSON.parse(local_tenant_id);
        const lead_id = JSON.parse(local_lead_id);
        try {
            if (local_tenant_id == null || local_lead_id == null) {
                return setGzLead({ vapid_config: {} }).then(() => showReminderPopup(settings?.popups?.blockOverride));
            }
            else if (!(local_status === permissionStatus)) {
                return updateGzLead({ vapid_config: {}, tenant_id: tenant_id, lead_id: lead_id });
            }
            showReminderPopup(settings?.popups?.blockOverride);
        }
        catch (error) {
            console.log('user rejected offer', error);
            //? add logic for showing this reminder after the delay.
            //?Don't throw error. it will collapse everything.
        }
    }
    async function showBellConfiguration() {
        const settings = GlobalInstance.getNotificationSettings();
        const options = settings?.popups?.blockOverride;
        console.log('block override settings ===>', settings?.popups?.blockOverride);
        if (!options?.enabled)
            return; //TODO
        try {
            showBellConfigurationPopup(settings?.popups?.blockOverride);
        }
        catch (error) {
            console.log('user rejected offer', error);
            //? add logic for showing this reminder after the delay.
            //?Don't throw error. it will collapse everything.
        }
    }
    const requestRemoteNotificationPermission = async () => {
        const currentPermission = await window.Notification.requestPermission((data) => {
            console.log({ dataFromCb: data });
        });
        if (currentPermission === 'granted') {
            return subscribeToPush();
        }
        else {
            const local_tenant_id = localStorage.getItem('tenant_id');
            const local_lead_id = localStorage.getItem('lead_id');
            if (local_tenant_id == null || local_lead_id == null) {
                setGzLead({ vapid_config: {} });
            }
        }
        throw currentPermission;
    };
    async function showNativePopup() {
        updatePopupStyle({ id: Config.iFrames.pushNotificationPopupFrame, type: 'HIDDEN' });
        try {
            await requestRemoteNotificationPermission();
            //TODO get subscription url and create a new lead for this browser;
        }
        catch (err) {
            if (err === 'default')
                return handleNativePopupClose();
            showBlockOverridePopup();
        }
    }
    async function userRejectedOffer() {
        const local_tenant_id = localStorage.getItem('tenant_id');
        const local_lead_id = localStorage.getItem('lead_id');
        if (local_tenant_id == null || local_lead_id == null) {
            setGzLead({ vapid_config: {} });
        }
        updatePopupStyle({ id: Config.iFrames.pushNotificationPopupFrame, type: 'HIDDEN' });
        const { popupType } = GlobalInstance.getNotificationPopupType();
        if (popupType === 'bell') {
            updatePopupStyle({ id: Config.iFrames.pushNotificationPopupFrame, type: 'BELL_ICON' });
            redirectFrame({ iframe: Config.iFrames.pushNotificationPopupFrame, location: `/push/popup/bell` });
        }
        //TODO register event for showing popup again after few time
    }
    async function saveSubscription(data) {
        // updatePopupStyle({ id: Config.iFrames.pushNotificationPopupFrame, type: 'HIDDEN' });
        const permissionStatus = getPushNotificationPermissionStatus();
        console.log(data);
        localStorage.setItem('gz_Subscription', JSON.stringify(data.vapid_config));
        localStorage.setItem('lead_id', JSON.stringify(data.lead_id));
        localStorage.setItem('tenant_id', JSON.stringify(data.tenant_id));
        localStorage.setItem('sub_status', data.status);
        if (permissionStatus === 'granted')
            return redirectFrame({ iframe: Config.iFrames.pushNotificationPopupFrame, location: `/bell-configuration` });
        if (permissionStatus === 'default')
            return updatePopupStyle({ id: Config.iFrames.pushNotificationPopupFrame, type: 'HIDDEN' });
        showBlockOverridePopup();
    }
    // export async function handleNotificationRequestRejection(options: PushNotification.popups) {
    // 	console.log({ requestRejection: options.blockOverride });
    // 	redirectFrame({
    // 		iframe: Config.iFrames.pushNotificationPopupFrame,
    // 		location: Config.frameLocations.subscriptionReminderPage,
    // 	});
    // }

    function onPageView(settings) {
        return new Promise((resolve, reject) => {
            if (!settings)
                reject('The page view trigger has got an empty settings');
            const { pageView } = settings;
            if (pageView === undefined || isNaN(pageView))
                reject('The page view has got an invalid settings');
            const observeUrlChange = () => {
                if (pageView === undefined || isNaN(pageView))
                    throw new Error('The page view has got an invalid settings');
                const body = document.querySelector('body');
                const paths = new Set([]);
                var pathCount;
                var getExistingUrlFromLocalStorage;
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach(() => {
                        let domain = new URL(window.location.href);
                        const pathname = domain.pathname;
                        var getUrlPaths = localStorage.getItem('urlPaths');
                        getUrlPaths != null ? (getExistingUrlFromLocalStorage = JSON.parse(getUrlPaths)) : null;
                        paths.add(pathname);
                        getUrlPaths != null
                            ? getExistingUrlFromLocalStorage.forEach((item) => paths.add(item))
                            : null;
                        localStorage.setItem('urlPaths', JSON.stringify([...paths]));
                        getUrlPaths != null ? (pathCount = JSON.parse(getUrlPaths).length) : null;
                        if (pathCount + 1 >= pageView)
                            resolve(true);
                    });
                });
                observer.observe(body, { childList: true, subtree: true });
            };
            observeUrlChange();
        });
    }

    function onScroll(options) {
        function getScrollPercent() {
            const documentNode = document.documentElement;
            const body = document.body;
            const documentTop = documentNode.scrollTop ?? body.scrollTop;
            const documentScroll = documentNode.scrollHeight ?? body.scrollHeight;
            const documentHeight = documentNode.clientHeight;
            return (documentTop / (documentScroll - documentHeight)) * 100;
        }
        return new Promise((resolve, reject) => {
            if (!options)
                reject('The timeout trigger has got an empty settings');
            const { scroll } = options;
            if (scroll === undefined || isNaN(scroll))
                reject('The timeout trigger has got an invalid settings');
            if (scroll === undefined || isNaN(scroll))
                return reject(false);
            let lastKnownScrollPosition = 0;
            function handleOnScroll() {
                if (scroll === undefined || isNaN(scroll))
                    return reject(false);
                lastKnownScrollPosition = getScrollPercent();
                console.log({ lastKnownScrollPosition });
                if (lastKnownScrollPosition >= scroll) {
                    document.removeEventListener('scroll', handleOnScroll);
                    resolve(true);
                }
            }
            document.addEventListener('scroll', handleOnScroll);
        });
    }

    function onTimeout(settings) {
        return new Promise((resolve, reject) => {
            if (!settings)
                reject('The timeout trigger has got an empty settings');
            const { timeDelay } = settings;
            if (timeDelay === undefined || isNaN(timeDelay))
                return reject('The timeout trigger has got an invalid settings');
            const requestPopupTimeDelay = localStorage.getItem('requestPopupTimeDelay');
            const requestPopupTimeOut = localStorage.requestPopupTimeOut;
            if (requestPopupTimeDelay == null) {
                localStorage.setItem('requestPopupTimeDelay', JSON.stringify(timeDelay));
            }
            if (requestPopupTimeOut == null || JSON.parse(requestPopupTimeDelay) !== timeDelay) {
                const requestPopupDate = new Date();
                requestPopupDate.setSeconds(requestPopupDate.getSeconds() + timeDelay);
                localStorage.requestPopupTimeOut = requestPopupDate;
                localStorage.setItem('requestPopupTimeDelay', JSON.stringify(timeDelay));
            }
            const requestPopupDate = new Date(localStorage.requestPopupTimeOut);
            const myRequestPopupInterval = setInterval(function () {
                const currentDate = new Date();
                console.log('currentDate', currentDate);
                console.log('requestPopupDate', requestPopupDate);
                if (currentDate >= requestPopupDate) {
                    resolve(true);
                    clearInterval(myRequestPopupInterval);
                    localStorage.setItem('requestPopupTimeDelay', JSON.stringify(0));
                }
            }, 3000);
            // setTimeout(() => resolve(true), timeDelay * 1000);
        });
    }

    function triggers(config) {
        switch (config.method) {
            case 'timeDelay':
                return onTimeout(config.settings);
            case 'scroll':
                return onScroll(config.settings);
            case 'pageView':
                return onPageView(config.settings);
            default:
                throw new Error('Push notification handler meet a unsupported trigger trigger settings ==>' + JSON.stringify(config));
        }
    }

    function blockOverrideOnTimeout(settings) {
        return new Promise((resolve, reject) => {
            if (!settings)
                reject('The timeout trigger has got an empty settings');
            const { timeDelay } = settings;
            if (timeDelay === undefined || isNaN(timeDelay))
                return reject('The timeout trigger has got an invalid settings');
            const blockOverrideTimeDelay = localStorage.getItem('blockOverrideTimeDelay');
            const blockOverrideTimeOut = localStorage.blockOverrideTimeOut;
            if (blockOverrideTimeDelay == null) {
                localStorage.setItem('blockOverrideTimeDelay', JSON.stringify(timeDelay));
            }
            if (blockOverrideTimeOut == null || JSON.parse(blockOverrideTimeDelay) !== timeDelay) {
                const blockOverrideDate = new Date();
                blockOverrideDate.setSeconds(blockOverrideDate.getSeconds() + timeDelay);
                localStorage.blockOverrideTimeOut = blockOverrideDate;
                localStorage.setItem('blockOverrideTimeDelay', JSON.stringify(timeDelay));
            }
            const blockOverrideDate = new Date(localStorage.blockOverrideTimeOut);
            const myInterval = setInterval(function () {
                const currentDate = new Date();
                if (currentDate >= blockOverrideDate) {
                    resolve(true);
                    clearInterval(myInterval);
                }
            }, 5000);
        });
    }

    function BlockOverrideTrigger(config) {
        if (config.noOfDayOrHour !== 0) {
            var seconds = { timeDelay: 0 };
            if (config.daysOrHours === 'day')
                seconds.timeDelay = config.noOfDayOrHour * 24 * 60 * 60;
            if (config.daysOrHours === 'hour')
                seconds.timeDelay = config.noOfDayOrHour * 60 * 60;
            return blockOverrideOnTimeout({ timeDelay: 100 });
        }
        else if (config.noOfPages !== 0) {
            const pagesRead = { pageView: config.noOfPages };
            return onPageView(pagesRead);
        }
        else {
            throw new Error('Push notification handler meet a unsupported trigger trigger settings ==>' + JSON.stringify(config));
        }
    }

    const showPermissionRequestingPopup = async (options) => {
        // console.log({ showPermissionRequestingPopup: options });
        const settings = GlobalInstance.getNotificationSettings();
        const { trigger } = settings?.popups.requestPopup;
        Logger.log({ method: trigger.method });
        Logger.table({ ...(trigger.settings ?? {}) });
        console.log('ddddddddd', trigger);
        await triggers(trigger);
        const { popupType } = options;
        const device = findDevice();
        const activePopupType = popupType?.[device] ?? 'toast';
        redirectFrame({ iframe: Config.iFrames.pushNotificationPopupFrame, location: `/push/popup/${activePopupType}` });
    };
    const showReminderPopup = async (options) => {
        const settings = GlobalInstance.getNotificationSettings();
        const { permissionPromptReminder } = settings?.popups.blockOverride;
        console.log('permissionPromptReminder', permissionPromptReminder);
        await BlockOverrideTrigger(permissionPromptReminder);
        redirectFrame({ iframe: Config.iFrames.pushNotificationPopupFrame, location: `/push/popup/block-override` });
        console.log({ showReminderPopup: options });
    };
    const showBellConfigurationPopup = async (options) => {
        // await renderReminderPopup(options);.
        const local_tenant_id = localStorage.getItem('tenant_id');
        const local_lead_id = localStorage.getItem('lead_id');
        if (local_tenant_id == null || local_lead_id == null) {
            requestRemoteNotificationPermission();
        }
        updateSubscriber();
        redirectFrame({ iframe: Config.iFrames.pushNotificationPopupFrame, location: `/bell-configuration` });
        console.log({ showBellConfiguration: options });
    };
    function sendEngagementPromptConfig({ frame, origin }) {
        const config = GlobalInstance.get('config');
        if (!config)
            throw new Error('Configuration is undefined, please check');
        const popup = config?.settings?.push_notification?.popups;
        if (!popup)
            throw new Error('Configuration is undefined, please check');
        // console.log({ popup });
        const message = { type: pushNotificationMessageTypes.POPUP_CONFIGURATION, data: popup };
        sendMessage({ window: frame, message, origin });
    }
    function updatePopupStyle(params) {
        const { id, type, addonStyle } = params;
        // console.log(params);
        const style = addonStyle ? `${iframeStyles[type]};${addonStyle};` : iframeStyles[type];
        // iframeStylesNeedScrollRemoval.includes(type) ? removeBodyScroll() : restoreBodyStyle();
        setStyle({ id, style });
    }
    const iframeStyles = {
        FULL_SCREEN: `border:none;display:block;position:fixed;top:0px;left:0px;width:100%;height:100%;z-index:99999999999999999`,
        HIDDEN: `display:none;`,
        BELL_ICON: 'display:block;position:fixed;z-index:99999999999999999;border:none;width:5rem;height:5rem;',
        BELL_ICON_FRAME: 'display: block;position: fixed;z-index: 99999999999999999;border: none;width: 460px;height: 220px;',
        BLOCK_OVERRIDE: 'display:block;position:fixed;z-index:99999999999999999;border:none;width:5rem;height:5rem;',
        BLOCK_OVERRIDE_FRAME: 'display: block;position: fixed;z-index: 99999999999999999;border: none;width: 460px;height: 220px;',
        BELL_PUSH_CONFIGURATION: 'display:block;position:fixed;z-index:99999999999999999;border:none;width:5rem;height:5rem;',
        BELL_PUSH_CONFIGURATION_FRAME: 'display: block;position: fixed;z-index: 99999999999999999;border: none;width: 420px;height: 390px;',
    };
    // const iframeStylesNeedScrollRemoval = ['FULL_SCREEN'] as (keyof typeof iframeStyles)[];
    function bellIconPopupStyles(params) {
        const { position } = GlobalInstance.getNotificationPopupType();
        const positionStyles = {
            bottomLeft: 'bottom:2rem;left:2rem;',
            bottomRight: 'bottom:2rem;right:2rem;',
        };
        const addonStyle = positionStyles[position] ?? positionStyles['bottomLeft'];
        updatePopupStyle({ ...params, addonStyle });
    }
    function blockOverridePopupStyles(params) {
        const { position } = GlobalInstance.getBlockOverRideType();
        const positionStyles = {
            bottomLeft: 'bottom:2rem;left:2rem;',
            bottomRight: 'bottom:2rem;right:2rem;',
        };
        const addonStyle = positionStyles[position] ?? positionStyles['bottomLeft'];
        updatePopupStyle({ ...params, addonStyle });
    }

    function runCampaigns(options) {
        GlobalInstance.set({ config: options });
        const { settings, vapidPublicKey } = options;
        localStorage.setItem('vapidPublicKey', vapidPublicKey);
        localStorage.setItem('workspace_id', options.workspaceId);
        const { push_notification } = settings;
        runPushNotificationCampaign(push_notification);
        // console.log({ push_notification });
    }

    function sendMessageToFrame({ iframe, message, origin = '*' }) {
        const frame = typeof iframe === 'string' ? document.getElementById(iframe) : iframe;
        if (!frame)
            throw new Error('Iframe not found, sending message has failed');
        try {
            frame.contentWindow?.postMessage(JSON.stringify(message), origin);
        }
        catch (err) {
            console.log('Error occurred while sending message sending to iframe ( id | frame ) ==> ' + iframe, err);
            throw err;
        }
    }
    function sendMessage(params) {
        const { message, origin, window } = params;
        try {
            window?.postMessage(JSON.stringify(message), origin);
        }
        catch (err) {
            console.log('Error occurred while sending message sending to window ( id | frame ) ==> ', window);
            throw err;
        }
    }
    function onReceiveMessage(callBack) {
        window.addEventListener('message', (e) => {
            if(typeof e.data!=='string') return
            const data = JSON.parse(e.data);
            callBack(data, e.source, e.origin);
        });
    }
    function onEmbedScriptReceiveMessage(message, frame, origin) {
        const messageType = message.type;
        console.log('received a message with type===>', message.type);
        switch (messageType) {
            case pushNotificationMessageTypes.CAMPAIGN_CONFIGURATION:
                runCampaigns(message.data);
                break;
            case pushNotificationMessageTypes.POPUP_CONFIGURATION:
                sendEngagementPromptConfig({ frame, origin });
                break;
            case pushNotificationMessageTypes.SHOW_TOAST_OR_MODAL_POPUP_IFRAME:
                updatePopupStyle(message.data);
                break;
            case pushNotificationMessageTypes.SHOW_BLOCKOVERRIDE_IFRAME:
                blockOverridePopupStyles(message.data);
                break;
            case pushNotificationMessageTypes.SHOW_BELL_ICON_IFRAME:
            case pushNotificationMessageTypes.SHOW_BELL_POPUP_IFRAME:
                bellIconPopupStyles(message.data);
                break;
            case pushNotificationMessageTypes.NOTIFICATION_PERMISSION_GRANTED:
                showNativePopup();
                break;
            case pushNotificationMessageTypes.NOTIFICATION_REQUEST_DENIED:
                userRejectedOffer();
                break;
            case pushNotificationMessageTypes.CREATE_SUBSCRIBER:
                saveSubscription(message.data);
                break;
            case pushNotificationMessageTypes.UPDATE_SUBSCRIBER:
                saveSubscription(message.data);
                break;
        }
    }
    function redirectFrame({ iframe, location }) {
        console.log('location', location);
        sendMessageToFrame({
            iframe,
            message: {
                data: { location },
                type: pushNotificationMessageTypes.REDIRECT,
            },
        });
    }

    init();
    async function init() {
        Logger.prettyPrint(Config.messages.running);
        try {
            const campaignId = CampaignService.getCampaignIdFromEmbeddedTag();
            console.log({ campaign: campaignId });
            if (!GlobalInstance.canInitialize())
                throw Error('Already initialized.');
            const globalInstance = {};
            GlobalInstance.register(globalInstance);
            registerMessageHook();
            registerServiceWorker();
            initCampaigns(campaignId);
        }
        catch (err) {
            console.error(err);
            Logger.prettyPrint(Config.messages.shuttingDown);
        }
    }
    function initCampaigns(campaignId) {
        createAndAppendIframe({
            src: Config.getCompleteRenderEngineUrl(`/campaign/${campaignId}`),
            id: Config.iFrames.pushNotificationPopupFrame,
            styles: 'display:none;width:1px;height:1px',
        });
    }
    function registerMessageHook() {
        onReceiveMessage(onEmbedScriptReceiveMessage);
    }

})();
//# sourceMappingURL=embed.js.map
