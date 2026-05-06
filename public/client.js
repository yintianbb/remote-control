const socket = io();
let currentDeviceId = null;
let requestId = 0;
const pending = {};

socket.on('connect',()=>document.getElementById('status').innerText='已连接 ✅');
socket.on('disconnect',()=>document.getElementById('status').innerText='离线 ❌');
socket.on('devices_update',(devices)=>{
    const container = document.getElementById('deviceList');
    if(!devices.length){ container.innerHTML='<div>暂无在线设备</div>'; return; }
    container.innerHTML = devices.map(d=>`<div class="device-item" data-id="${d.deviceId}"><strong>${d.hostname}</strong><br>${d.platform}</div>`).join('');
    document.querySelectorAll('.device-item').forEach(el=>{
        el.addEventListener('click',()=>{
            document.querySelectorAll('.device-item').forEach(i=>i.classList.remove('active'));
            el.classList.add('active');
            currentDeviceId = el.dataset.id;
            loadDeviceInfo();
        });
    });
});

function sendAction(action,params){
    return new Promise((resolve)=>{
        const rid = ++requestId;
        pending[rid]=resolve;
        socket.emit('device_action',{deviceId:currentDeviceId,action,params,requestId:rid});
        setTimeout(()=>{ if(pending[rid]){ pending[rid]({error:'超时'}); delete pending[rid]; } },15000);
    });
}
socket.on('action_response',(data)=>{
    if(pending[data.requestId]) pending[data.requestId](data);
    delete pending[data.requestId];
});

async function loadDeviceInfo(){
    const res = await sendAction('get_system_info',{});
    if(res.error) document.getElementById('infoDetail').innerHTML='获取失败';
    else document.getElementById('infoDetail').innerHTML=`<p>设备ID: ${res.result.deviceId}</p><p>主机名: ${res.result.hostname}</p><p>平台: ${res.result.platform}</p>`;
}

document.getElementById('browseBtn').onclick=async()=>{
    const path = document.getElementById('filePath').value;
    const res = await sendAction('list_files',{path});
    if(res.error) document.getElementById('fileList').innerHTML=`错误:${res.error}`;
    else {
        const items = res.result.items||[];
        document.getElementById('fileList').innerHTML = items.map(f=>`<div class="file-item" data-path="${f.path}">${f.isDirectory?'📁':'📄'} ${f.name}</div>`).join('');
        document.querySelectorAll('.file-item').forEach(el=>{
            el.ondblclick=()=>{
                document.getElementById('filePath').value = el.dataset.path;
                document.getElementById('browseBtn').click();
            };
        });
    }
};
document.getElementById('screenshotBtn').onclick=async()=>{
    const res = await sendAction('screenshot',{});
    if(res.error) document.getElementById('screenshotPreview').innerHTML=`截图失败:${res.error}`;
    else document.getElementById('screenshotPreview').innerHTML = `<img src="${res.result.image}">`;
};
document.getElementById('execBtn').onclick=async()=>{
    const cmd = document.getElementById('cmdInput').value;
    if(!cmd.trim()) return;
    const res = await sendAction('execute_command',{command:cmd});
    document.getElementById('cmdOutput').innerText = res.error || res.result || '(无输出)';
};
