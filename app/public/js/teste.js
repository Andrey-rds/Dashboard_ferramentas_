let dashboardData = null;
let combinedChart = null;
const sparklineCharts = new Map();
const iconMap = { n8n:'fa-diagram-project', elevenlabs:'fa-wave-square', supabase:'fa-database', insidetv:'fa-tv', openai:'fa-brain' };
const healthLabels = { ok:'ESTÁVEL', alerta:'ALERTA', critico:'CRÍTICO' };
const severityLabels = { ok:'ESTÁVEL', alerta:'ALERTA', critico:'CRÍTICO' };
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character])); }
function renderServices() {
  document.getElementById('service-grid').innerHTML = dashboardData.ferramentas.map(service => `
    <article class="grafana-card service-card" style="--accent:${service.cor};--secondary:${service.corSecundaria}">
      <div><div class="service-head"><div class="service-name"><div class="service-icon"><i class="fa-solid ${iconMap[service.id] || 'fa-server'}"></i></div><div><h2>${escapeHtml(service.nome)}</h2><p>${escapeHtml(service.descricao)}</p></div></div><span class="health-badge health-${escapeHtml(service.nivelSaude)}">${healthLabels[service.nivelSaude] || 'SEM DADOS'}</span></div>
      <div class="metric-grid"><div class="metric"><small>LATÊNCIA</small><strong id="ping-${service.id}">${service.latencia} MS</strong></div><div class="metric"><small>${escapeHtml(service.metricaRotulo)}</small><strong>${escapeHtml(service.metricaValor)}</strong></div></div></div>
      <div class="sparkline"><canvas id="chart-${service.id}"></canvas></div><div class="service-footer"><span>UPTIME 30D: <b>${escapeHtml(service.uptime)}</b></span><span>${escapeHtml(service.rodape)}</span></div>
    </article>`).join('');
  dashboardData.ferramentas.forEach(createSparkline);
}
function createSparkline(service) { const chart = new Chart(document.getElementById(`chart-${service.id}`), { type:'line', data:{ labels:service.historico.map(() => ''), datasets:[{ data:service.historico, borderColor:service.cor, borderWidth:3, pointRadius:0, tension:.4, fill:true, backgroundColor:`${service.cor}22` }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }, tooltip:{ enabled:false } }, scales:{ x:{ display:false }, y:{ display:false, min:0 } } } }); sparklineCharts.set(service.id, chart); }
function renderCombinedChart() { combinedChart = new Chart(document.getElementById('chart-combined'), { type:'line', data:{ labels:dashboardData.grafico.labels, datasets:dashboardData.ferramentas.map(service => ({ label:service.nome, data:service.historicoCombinado, borderColor:service.cor, borderWidth:3, pointRadius:0, tension:.35 })) }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:'#F4F5F7', boxWidth:16, padding:14, font:{ size:13, family:'Outfit', weight:'bold' } } } }, scales:{ x:{ grid:{ color:'#ffffff20' }, ticks:{ color:'#F4F5F7', font:{ size:12, family:'JetBrains Mono', weight:'bold' } } }, y:{ grid:{ color:'#ffffff20' }, ticks:{ color:'#F4F5F7', font:{ size:12, family:'JetBrains Mono', weight:'bold' } } } } } }); }
function renderLogs() { document.getElementById('log-feed').innerHTML = dashboardData.logs.map(log => `<div class="log-line"><span class="log-time">[${escapeHtml(log.hora)}]</span><span class="log-service">${escapeHtml(log.servico)}</span><span class="log-result">${escapeHtml(log.resultado)}</span></div>`).join(''); document.getElementById('log-summary').innerText = dashboardData.resumoLogs; }
function renderIncidents() {
  const counts = { ok:0, alerta:0, critico:0 };
  dashboardData.ferramentas.forEach(service => { counts[service.nivelSaude] = (counts[service.nivelSaude] || 0) + 1; });
  document.getElementById('count-ok').innerText = counts.ok || 0;
  document.getElementById('count-warning').innerText = counts.alerta || 0;
  document.getElementById('count-critical').innerText = counts.critico || 0;
  const allIncidents = dashboardData.incidentes || [];
  document.getElementById('incident-updated').innerText = `3 MAIS RECENTES DE ${allIncidents.length}`;
  const incidents = [...allIncidents].sort((a, b) => b.hora.localeCompare(a.hora)).slice(0, 3);
  document.getElementById('incident-list').innerHTML = incidents.map(incident => `
    <tr class="incident-row incident-${escapeHtml(incident.nivel)}">
      <td><span class="incident-severity"><i class="fa-solid ${incident.nivel === 'critico' ? 'fa-circle-exclamation' : 'fa-triangle-exclamation'}"></i>${severityLabels[incident.nivel] || 'REGISTRO'}</span></td>
      <td class="incident-time">${escapeHtml(incident.hora)}</td>
      <td class="incident-source"><strong>${escapeHtml(incident.ferramenta)}</strong><span>${escapeHtml(incident.codigo)}</span></td>
      <td class="incident-description">${escapeHtml(incident.descricao)}</td>
    </tr>`).join('');
  document.getElementById('incident-empty').hidden = incidents.length > 0;
  document.querySelector('.incident-table').hidden = incidents.length === 0;
}
function updateClock() { document.getElementById('live-clock').innerText = new Date().toLocaleTimeString('pt-BR'); }
function updateLiveData() { dashboardData.ferramentas.forEach((service,index) => { const current = Math.max(1, Math.round(service.latencia + (Math.random() * service.variacao * 2 - service.variacao))); document.getElementById(`ping-${service.id}`).innerText = `${current} MS`; service.historico.shift(); service.historico.push(current); service.historicoCombinado.shift(); service.historicoCombinado.push(current); const sparkline = sparklineCharts.get(service.id); sparkline.data.datasets[0].data = service.historico; sparkline.update(); combinedChart.data.datasets[index].data = service.historicoCombinado; }); dashboardData.grafico.labels.shift(); dashboardData.grafico.labels.push(new Date().toLocaleTimeString('pt-BR')); combinedChart.data.labels = dashboardData.grafico.labels; combinedChart.update(); }
async function init() { const response = await fetch(`/dados_teste.json?t=${Date.now()}`); if (!response.ok) throw new Error('FALHA AO CARREGAR DADOS DO DASHBOARD'); dashboardData = await response.json(); dashboardData.incidentes = dashboardData.incidentes || []; document.getElementById('dashboard-title').firstChild.textContent = `${dashboardData.cabecalho.titulo} `; document.getElementById('dashboard-version').innerText = dashboardData.cabecalho.versao; document.getElementById('dashboard-subtitle').innerText = dashboardData.cabecalho.subtitulo; document.getElementById('system-status').innerText = dashboardData.cabecalho.status; document.getElementById('response-rate').innerText = dashboardData.cabecalho.taxaResposta; document.getElementById('global-load').innerText = dashboardData.cabecalho.cargaGlobal; document.getElementById('refresh-interval').innerText = dashboardData.atualizacao.intervalo; renderServices(); renderCombinedChart(); renderLogs(); renderIncidents(); updateClock(); setInterval(updateClock,1000); setInterval(updateLiveData,dashboardData.atualizacao.intervaloMs); }
window.addEventListener('load', () => init().catch(error => { console.error(error); document.getElementById('system-status').innerText = 'FALHA AO CARREGAR DADOS'; }));
