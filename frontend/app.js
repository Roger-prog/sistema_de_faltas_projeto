const API_BASE = 'http://localhost:3001/api';

document.addEventListener('DOMContentLoaded', () => {
  loadMaterias();
  loadFaltas();
  loadTotalCount();

  document.getElementById('addMateriaBtn').addEventListener('click', addMateria);
  document.getElementById('saveFaltaBtn').addEventListener('click', saveFalta);
  document.getElementById('cancelFaltaBtn').addEventListener('click', cancelFalta);
  document.getElementById('filterMateria').addEventListener('change', filterFaltas);
});

let materias = [];
let allFaltas = [];
let editingFaltaId = null;

async function loadMaterias() {
  try {
    const res = await fetch(`${API_BASE}/materias`);
    materias = await res.json();

    const select = document.getElementById('materiaSelect');
    select.innerHTML = '<option value="">Selecione uma matéria</option>';
    materias.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.nome;
      select.appendChild(opt);
    });

    updateMateriaList();
    updateFilterSelect();
  } catch (err) {
    console.error('Erro ao carregar matérias:', err);
  }
}

async function loadFaltas() {
  try {
    const res = await fetch(`${API_BASE}/faltas/count/by-materia`);
    const counts = await res.json();

    const res2 = await fetch(`${API_BASE}/faltas`);
    allFaltas = await res2.json();

    renderFaltas(allFaltas, counts);
  } catch (err) {
    console.error('Erro ao carregar faltas:', err);
  }
}

async function loadTotalCount() {
  try {
    const res = await fetch(`${API_BASE}/faltas/count`);
    const data = await res.json();
    document.getElementById('totalCount').textContent = data.total;
  } catch (err) {
    console.error('Erro ao carregar contagem:', err);
  }
}

async function addMateria() {
  const input = document.getElementById('materiaInput');
  const nome = input.value.trim();
  if (!nome) return;

  try {
    const res = await fetch(`${API_BASE}/materias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    if (!res.ok) {
      if (res.status === 409) {
        showMessage('Matéria já cadastrada', 'error');
      } else {
        showMessage('Erro ao adicionar matéria', 'error');
      }
      return;
    }

    input.value = '';
    await loadMaterias();
    await loadFaltas();
    await loadTotalCount();
    showMessage('Matéria adicionada com sucesso!', 'success');
  } catch (err) {
    showMessage('Erro ao adicionar matéria', 'error');
  }
}

function updateMateriaList() {
  const list = document.getElementById('materiaList');
  if (materias.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhuma matéria cadastrada</p>';
    return;
  }

  list.innerHTML = materias.map(m => `
    <div class="materia-item">
      <span class="materia-name">${m.nome}</span>
      <span class="falta-count" id="count-${m.id}">0</span>
      <span class="remove-materia" onclick="removeMateria(${m.id})">✕</span>
    </div>
  `).join('');

  loadMateriaCounts();
}

async function loadMateriaCounts() {
  try {
    const materiasRes = await fetch(`${API_BASE}/materias`);
    const resCounts = await fetch(`${API_BASE}/faltas/count/by-materia`);
    const counts = await resCounts.json();
    const materiasData = await materiasRes.json();

    materiasData.forEach(m => {
      const count = counts.find(c => c.id === m.id);
      const el = document.getElementById(`count-${m.id}`);
      if (el) {
        el.textContent = count ? count.total : 0;
      }
    });
  } catch (err) {
    console.error('Erro ao carregar contagens:', err);
  }
}

async function removeMateria(id) {
  if (!confirm('Tem certeza que deseja remover esta matéria? Todas as faltas associadas serão removidas.')) return;

  try {
    const res = await fetch(`${API_BASE}/materias/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Erro ao remover matéria');

    await loadMaterias();
    await loadFaltas();
    await loadTotalCount();
    showMessage('Matéria removida com sucesso!', 'success');
  } catch (err) {
    showMessage('Erro ao remover matéria', 'error');
  }
}

function updateFilterSelect() {
  const filter = document.getElementById('filterMateria');
  const placeholder = '<option value="all">Todas as matérias</option>';
  filter.innerHTML = placeholder + materias.map(m =>
    `<option value="${m.id}">${m.nome}</option>`
  ).join('');
}

function filterFaltas() {
  const select = document.getElementById('filterMateria');
  const value = select.value;
  if (value === 'all') {
    renderFaltas(allFaltas);
  } else {
    const filtered = allFaltas.filter(f => f.materia_id === parseInt(value));
    renderFaltas(filtered);
  }
}

function renderFaltas(faltas) {
  const list = document.getElementById('faltasList');
  if (faltas.length === 0) {
    list.innerHTML = '<p class="empty-message">Nenhuma falta registrada</p>';
    return;
  }

  list.innerHTML = faltas.map(f => `
    <div class="falta-item" data-id="${f.id}">
      <div class="falta-info">
        <div class="falta-data">${formatDate(f.data)}</div>
        <div class="falta-materia">${f.materia}</div>
        ${f.observacao ? `<div class="falta-observacao">${f.observacao}</div>` : ''}
      </div>
      <div class="falta-actions">
        <button onclick="editFalta(${f.id})">Editar</button>
        <button onclick="deleteFalta(${f.id})">Excluir</button>
      </div>
    </div>
  `).join('');
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return d.toLocaleDateString('pt-BR', options);
}

let materiasCache = [];

async function refreshMateriasCache() {
  const res = await fetch(`${API_BASE}/materias`);
  materiasCache = await res.json();
  return materiasCache;
}

async function saveFalta(e) {
  e.preventDefault();

  const materiaId = document.getElementById('materiaSelect').value;
  const data = document.getElementById('dataFalta').value;
  const observacao = document.getElementById('observacao').value.trim();

  if (!materiaId || !data) {
    showMessage('Por favor, preencha todos os campos obrigatórios', 'error');
    return;
  }

  try {
    const body = {
      materia_id: parseInt(materiaId),
      data: data,
      observacao: observacao || null
    };

    let res;
    if (editingFaltaId) {
      res = await fetch(`${API_BASE}/faltas/${editingFaltaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } else {
      res = await fetch(`${API_BASE}/faltas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    if (!res.ok) throw new Error('Erro ao salvar falta');

    await loadFaltas();
    await loadTotalCount();
    cancelFalta();
    showMessage(editingFaltaId ? 'Falta atualizada!' : 'Falta registrada!', 'success');
  } catch (err) {
    showMessage('Erro ao salvar falta: ' + err.message, 'error');
  }
}

function cancelFalta() {
  editingFaltaId = null;
  document.getElementById('materiaSelect').value = '';
  document.getElementById('dataFalta').value = '';
  document.getElementById('observacao').value = '';
  document.getElementById('saveFaltaBtn').textContent = 'Salvar Falta';
}

async function deleteFalta(id) {
  if (!confirm('Tem certeza que deseja excluir esta falta?')) return;

  try {
    const res = await fetch(`${API_BASE}/faltas/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Erro ao excluir falta');

    await loadFaltas();
    await loadTotalCount();
    showMessage('Falta excluída com sucesso!', 'success');
  } catch (err) {
    showMessage('Erro ao excluir falta', 'error');
  }
}

function showMessage(msg, type) {
  let el = document.getElementById('messageBox');
  if (!el) {
    el = document.createElement('div');
    el.id = 'messageBox';
    el.className = `message ${type}`;
    el.textContent = msg;
    document.querySelector('.container').prepend(el);
  }
  el.textContent = msg;
  el.className = `message ${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

refreshMateriasCache();