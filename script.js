  const textInput = document.getElementById('text-input');
  const fgColor = document.getElementById('fg-color');
  const bgColor = document.getElementById('bg-color');
  const ecLevel = document.getElementById('ec-level');
  const sizeOptions = document.getElementById('size-options');
  const qrTarget = document.getElementById('qr-target');
  const generateBtn = document.getElementById('generate-btn');
  const scanLine = document.getElementById('scan-line');
  const metaSize = document.getElementById('meta-size');
  const metaEc = document.getElementById('meta-ec');
  const downloadBtn = document.getElementById('download-png');

  let currentSize = 256;
  let qr = null;

  sizeOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    sizeOptions.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSize = parseInt(btn.dataset.size, 10);
    generate();
  });

  function ecMap(level){
    return { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M,
             Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H }[level];
  }

  function generate(){
    const text = textInput.value.trim();
    qrTarget.innerHTML = '';

    if(!text){
      qrTarget.innerHTML = `<div class="empty-state">— NO SIGNAL —<br>enter content and generate</div>`;
      metaSize.textContent = `${currentSize} × ${currentSize}`;
      metaEc.textContent = `EC: ${ecLevel.value}`;
      return;
    }

    qr = new QRCode(qrTarget, {
      text: text,
      width: currentSize,
      height: currentSize,
      colorDark: fgColor.value,
      colorLight: bgColor.value,
      correctLevel: ecMap(ecLevel.value)
    });

    metaSize.textContent = `${currentSize} × ${currentSize}`;
    metaEc.textContent = `EC: ${ecLevel.value}`;

    scanLine.classList.remove('active');
    void scanLine.offsetWidth;
    scanLine.classList.add('active');
  }

  downloadBtn.addEventListener('click', () => {
    const canvas = qrTarget.querySelector('canvas');
    const img = qrTarget.querySelector('img');
    let dataUrl;

    if(canvas){
      dataUrl = canvas.toDataURL('image/png');
    } else if(img){
      dataUrl = img.src;
    } else {
      return;
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qr-code.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  generateBtn.addEventListener('click', generate);
  [fgColor, bgColor, ecLevel].forEach(el => el.addEventListener('change', generate));
  textInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && (e.metaKey || e.ctrlKey)){
      generate();
    }
  });

  // initial generate
  generate();

  // ---------------- App tabs ----------------
  const appTabs = document.getElementById('app-tabs');
  const generateView = document.getElementById('generate-view');
  const scanView = document.getElementById('scan-view');

  appTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    appTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    generateView.style.display = tab === 'generate' ? 'block' : 'none';
    scanView.style.display = tab === 'scan' ? 'block' : 'none';
    if(tab !== 'scan') stopCamera();
  });

  // ---------------- Wi-Fi QR scanner ----------------
  const scanVideo = document.getElementById('scan-video');
  const scanPlaceholder = document.getElementById('scan-placeholder');
  const scanCanvas = document.getElementById('scan-canvas');
  const scanToggleBtn = document.getElementById('scan-toggle-btn');
  const camScanLine = document.getElementById('cam-scan-line');
  const scanStatusRow = document.getElementById('scan-status-row');
  const scanStatusText = document.getElementById('scan-status-text');
  const scanResult = document.getElementById('scan-result');
  const resultRaw = document.getElementById('result-raw');
  const resultRawCopy = document.getElementById('result-raw-copy');
  const resultTypeLabel = document.getElementById('result-type-label');
  const resultPasswordRow = document.getElementById('result-password-row');
  const resultSecurityRow = document.getElementById('result-security-row');
  const resultPassword = document.getElementById('result-password');
  const resultPasswordCopy = document.getElementById('result-password-copy');
  const resultSecurity = document.getElementById('result-security');
  const resultPwToggle = document.getElementById('result-pw-toggle');
  const openLinkBtn = document.getElementById('open-link-btn');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const scanAgainBtn = document.getElementById('scan-again-btn');

  const scanCtx = scanCanvas.getContext('2d', { willReadFrequently: true });
  let cameraStream = null;
  let scanRAF = null;
  let lastResult = null;

  function unescWifi(str){
    return str.replace(/\\(.)/g, '$1');
  }

  function parseWifiString(str){
    if(!/^WIFI:/i.test(str)) return null;
    const body = str.replace(/^WIFI:/i, '');
    const re = /([A-Za-z]):((?:\\.|[^\\;])*);/g;
    const out = {};
    let m;
    while((m = re.exec(body)) !== null){
      out[m[1].toUpperCase()] = unescWifi(m[2]);
    }
    if(!out.S) return null;
    return {
      ssid: out.S,
      password: out.P || '',
      security: (out.T || 'nopass').toUpperCase(),
      hidden: out.H === 'true'
    };
  }

  function detectUrl(str){
    if(/^https?:\/\//i.test(str)) return str;
    if(/^www\./i.test(str)) return 'https://' + str;
    return null;
  }

  function detectMailto(str){
    if(/^mailto:/i.test(str)) return str.replace(/^mailto:/i, '');
    if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return str;
    return null;
  }

  function detectTel(str){
    if(/^tel:/i.test(str)) return str.replace(/^tel:/i, '');
    return null;
  }

  async function startCamera(){
    scanResult.style.display = 'none';
    try{
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
    } catch(err){
      scanStatusText.textContent = 'Camera access denied or unavailable';
      return;
    }
    scanVideo.srcObject = cameraStream;
    scanVideo.style.display = 'block';
    scanPlaceholder.style.display = 'none';
    scanToggleBtn.textContent = 'Stop camera';
    scanStatusRow.classList.add('live');
    scanStatusText.textContent = 'Scanning for a Wi-Fi code…';
    camScanLine.classList.add('active');
    scanVideo.play();
    scanRAF = requestAnimationFrame(scanFrame);
  }

  function stopCamera(){
    if(scanRAF) cancelAnimationFrame(scanRAF);
    scanRAF = null;
    if(cameraStream){
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
    }
    scanVideo.style.display = 'none';
    scanPlaceholder.style.display = 'block';
    scanToggleBtn.textContent = 'Start camera';
    scanStatusRow.classList.remove('live');
    scanStatusText.textContent = 'Camera idle';
    camScanLine.classList.remove('active');
  }

  function scanFrame(){
    if(scanVideo.readyState === scanVideo.HAVE_ENOUGH_DATA){
      scanCanvas.width = scanVideo.videoWidth;
      scanCanvas.height = scanVideo.videoHeight;
      scanCtx.drawImage(scanVideo, 0, 0, scanCanvas.width, scanCanvas.height);
      const imageData = scanCtx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
      const code = window.jsQR ? jsQR(imageData.data, imageData.width, imageData.height) : null;
      if(code && code.data){
        handleDecoded(code.data);
        return;
      }
    }
    scanRAF = requestAnimationFrame(scanFrame);
  }

  function copyText(btn, value){
    navigator.clipboard.writeText(value).then(() => {
      const original = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = original; }, 1200);
    }).catch(() => { /* clipboard unavailable — silently ignore */ });
  }

  function handleDecoded(data){
    lastResult = data;
    stopCamera();

    // reset extra rows/buttons each time
    resultPasswordRow.style.display = 'none';
    resultSecurityRow.style.display = 'none';
    openLinkBtn.style.display = 'none';
    openSettingsBtn.style.display = 'none';

    const wifi = parseWifiString(data);
    const url = detectUrl(data);
    const email = detectMailto(data);
    const tel = detectTel(data);

    if(wifi){
      resultTypeLabel.textContent = 'SSID';
      resultRaw.textContent = wifi.ssid;
      resultPassword.textContent = wifi.password || '(none)';
      resultPassword.classList.add('masked');
      resultPwToggle.textContent = 'Show';
      resultSecurity.textContent = wifi.security === 'NOPASS' ? 'Open network' : wifi.security;
      resultPasswordRow.style.display = 'flex';
      resultSecurityRow.style.display = 'flex';
      openSettingsBtn.style.display = 'block';
      openSettingsBtn.textContent = 'Open Wi-Fi settings';
    } else if(url){
      resultTypeLabel.textContent = 'Link';
      resultRaw.textContent = data;
      openLinkBtn.style.display = 'block';
      openLinkBtn.textContent = 'Open link';
      openLinkBtn.onclick = () => window.open(url, '_blank', 'noopener');
    } else if(email){
      resultTypeLabel.textContent = 'Email';
      resultRaw.textContent = data;
      openLinkBtn.style.display = 'block';
      openLinkBtn.textContent = 'Compose email';
      openLinkBtn.onclick = () => { window.location.href = /^mailto:/i.test(data) ? data : ('mailto:' + data); };
    } else if(tel){
      resultTypeLabel.textContent = 'Phone';
      resultRaw.textContent = data;
      openLinkBtn.style.display = 'block';
      openLinkBtn.textContent = 'Call number';
      openLinkBtn.onclick = () => { window.location.href = 'tel:' + tel; };
    } else {
      resultTypeLabel.textContent = 'Content';
      resultRaw.textContent = data;
    }

    scanResult.style.display = 'block';
  }

  function openWifiSettings(){
    const ua = navigator.userAgent;
    let uri = null;
    if(/Windows/i.test(ua)) uri = 'ms-settings:network-wifi';
    else if(/Macintosh|Mac OS/i.test(ua)) uri = 'x-apple.systempreferences:com.apple.preference.network';
    if(uri){
      window.location.href = uri;
    } else {
      alert('Open your system Wi-Fi settings, then paste the copied network name and password.');
    }
  }

  scanToggleBtn.addEventListener('click', () => {
    if(cameraStream){ stopCamera(); } else { startCamera(); }
  });

  resultPwToggle.addEventListener('click', () => {
    const masked = resultPassword.classList.toggle('masked');
    resultPwToggle.textContent = masked ? 'Show' : 'Hide';
  });

  resultRawCopy.addEventListener('click', () => copyText(resultRawCopy, resultRaw.textContent));
  resultPasswordCopy.addEventListener('click', () => copyText(resultPasswordCopy, resultPassword.textContent));

  openSettingsBtn.addEventListener('click', openWifiSettings);

  scanAgainBtn.addEventListener('click', () => {
    scanResult.style.display = 'none';
    startCamera();
  });

