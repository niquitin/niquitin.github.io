'use strict';
/* Local release gate, no credentials and no source changes.
 * Usage: node tools/check-android-release.cjs <signed.apk> <apksigner executable> */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const manifest=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','android-latest.json'),'utf8'));
const file=process.argv[2],signerExe=process.argv[3];
if(!file||!signerExe)throw Error('Usage: check-android-release.cjs <signed.apk> <apksigner.bat>');
const fail=(s)=>{throw Error(s)};
if(manifest.schemaVersion!==1||manifest.applicationId!=='com.partygame.vuabannhau')fail('Unsupported release manifest');
if(!/^[a-f0-9]{64}$/.test(manifest.sha256)||!/^[a-f0-9]{64}$/.test(manifest.signerCertificateSha256))fail('Bad SHA digest');
const expectedUrl='https://github.com/niquitin/niquitin.github.io/releases/download/v'+manifest.version+'/'+manifest.filename;
if(manifest.downloadUrl!==expectedUrl)fail('Release URL mismatch');
const buffer=fs.readFileSync(file);
const hash=crypto.createHash('sha256').update(buffer).digest('hex');
if(hash!==manifest.sha256||buffer.length!==manifest.sizeBytes)fail('APK bytes/hash differ from latest manifest');
const signerJar=path.join(path.dirname(signerExe),'lib','apksigner.jar');
if(!fs.existsSync(signerJar))fail('Android apksigner.jar missing');
const output=cp.execFileSync('java.exe',['-jar',signerJar,'verify','--print-certs',file],{encoding:'utf8',maxBuffer:1024*1024,windowsHide:true});
const line=output.match(/Signer #1 certificate SHA-256 digest:\s*([0-9a-f]{64})/i);
if(!line||line[1].toLowerCase()!==manifest.signerCertificateSha256)fail('APK signing identity changed');
console.log('APK_RELEASE_PARITY=PASS');
console.log('VERSION='+manifest.version+' CODE='+manifest.versionCode);
console.log('SIGNED_CERT_SHA256='+line[1].toLowerCase());
console.log('APK_SHA256='+hash+' BYTES='+buffer.length);
