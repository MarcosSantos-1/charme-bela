import { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import type { ComponentProps } from 'react';
import type { FirebaseWebConfig } from './types';

type Props = Omit<ComponentProps<typeof WebView>, 'source' | 'onMessage'> & {
  firebaseConfig: FirebaseWebConfig;
  firebaseVersion?: string;
  appVerificationDisabledForTesting?: boolean;
  languageCode?: string;
  onLoad?: () => void;
  onError?: () => void;
  onVerify: (token: string) => void;
  onFullChallenge?: () => void;
  invisible?: boolean;
  verify?: boolean;
};

function getWebviewSource(
  firebaseConfig: FirebaseWebConfig,
  firebaseVersion = '8.0.0',
  appVerificationDisabledForTesting = false,
  languageCode?: string,
  invisible?: boolean
) {
  return {
    baseUrl: `https://${firebaseConfig.authDomain}`,
    html: `<!DOCTYPE html><html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
  <script src="https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app.js"></script>
  <script src="https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-auth.js"></script>
  <script>firebase.initializeApp(${JSON.stringify(firebaseConfig)});</script>
  <style>
    html, body { height: 100%; ${invisible ? 'padding:0;margin:0;' : ''} }
    #recaptcha-btn { width:100%;height:100%;padding:0;margin:0;border:0; }
  </style>
</head>
<body>
  ${
    invisible
      ? `<button id="recaptcha-btn" type="button" onclick="onClickButton()">Confirm reCAPTCHA</button>`
      : `<div id="recaptcha-cont" class="g-recaptcha"></div>`
  }
  <script>
    var fullChallengeTimer;
    function onVerify(token) {
      if (fullChallengeTimer) { clearInterval(fullChallengeTimer); fullChallengeTimer = undefined; }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: token }));
    }
    function onLoad() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'load' }));
      firebase.auth().settings.appVerificationDisabledForTesting = ${appVerificationDisabledForTesting};
      ${languageCode ? `firebase.auth().languageCode = '${languageCode}';` : ''}
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("${
        invisible ? 'recaptcha-btn' : 'recaptcha-cont'
      }", {
        size: "${invisible ? 'invisible' : 'normal'}",
        callback: onVerify
      });
      window.recaptchaVerifier.render();
    }
    function onError() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error' }));
    }
    function onClickButton() {
      if (!fullChallengeTimer) {
        fullChallengeTimer = setInterval(function() {
          var iframes = document.getElementsByTagName("iframe");
          var isFullChallenge = false;
          for (var i = 0; i < iframes.length; i++) {
            var parentWindow = iframes[i].parentNode ? iframes[i].parentNode.parentNode : undefined;
            var isHidden = parentWindow && parentWindow.style.opacity == 0;
            isFullChallenge = isFullChallenge || (
              !isHidden &&
              ((iframes[i].title === 'recaptcha challenge') ||
               (iframes[i].src.indexOf('google.com/recaptcha/api2/bframe') >= 0)));
          }
          if (isFullChallenge) {
            clearInterval(fullChallengeTimer);
            fullChallengeTimer = undefined;
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'fullChallenge' }));
          }
        }, 100);
      }
    }
    window.addEventListener('message', function(event) {
      if (event.data.verify) {
        document.getElementById('recaptcha-btn').click();
      }
    });
  </script>
  <script src="https://www.google.com/recaptcha/api.js?onload=onLoad&render=explicit&hl=${
    languageCode ?? ''
  }" onerror="onError()"></script>
</body></html>`,
  };
}

export function FirebaseRecaptcha({
  firebaseConfig,
  firebaseVersion,
  appVerificationDisabledForTesting,
  languageCode,
  onVerify,
  onLoad,
  onError,
  onFullChallenge,
  invisible,
  verify,
  ...otherProps
}: Props) {
  const webview = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (webview.current && loaded && verify) {
      webview.current.injectJavaScript(`
        (function(){
          window.dispatchEvent(new MessageEvent('message', {data: { verify: true }}));
        })();
        true;
      `);
    }
  }, [loaded, verify]);

  if (!firebaseConfig?.authDomain) {
    console.error('FirebaseRecaptcha: missing firebaseConfig.authDomain');
    return null;
  }

  return (
    <WebView
      ref={webview}
      javaScriptEnabled
      automaticallyAdjustContentInsets
      scalesPageToFit
      mixedContentMode="always"
      source={getWebviewSource(
        firebaseConfig,
        firebaseVersion,
        appVerificationDisabledForTesting,
        languageCode,
        invisible
      )}
      onError={onError}
      onMessage={(event) => {
        const data = JSON.parse(event.nativeEvent.data);
        switch (data.type) {
          case 'load':
            setLoaded(true);
            onLoad?.();
            break;
          case 'error':
            onError?.();
            break;
          case 'verify':
            onVerify(data.token);
            break;
          case 'fullChallenge':
            onFullChallenge?.();
            break;
        }
      }}
      {...otherProps}
    />
  );
}
