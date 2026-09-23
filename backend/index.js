const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('API do Sistema de Faltas - Funcionando!');
});

app.get('/api/materias', (req, res) => {
  db.all('SELECT * FROM materias ORDER BY nome', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

app.post('/api/materias', (req, res) => {
  const { nome } = req.body;
  if (!nome) {
    return res.status(400).json({ error: 'Nome da matéria é obrigatório' });
  }
  db.run('INSERT INTO materias (nome) VALUES (?)', [nome], function (err) {
    if (err) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(409).json({ error: 'Matéria já cadastrada' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: this.lastID, nome });
  });
});

app.get('/api/faltas', (req, res) => {
  db.all(
    `SELECT f.id, f.data, f.observacao, f.materia_id,
            COALESCE(m.nome, 'Matéria excluída') as materia FROM faltas f
     LEFT JOIN materias m ON f.materia_id = m.id
     ORDER BY f.data DESC, materia`,
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json(rows);
      }
    }
  );
});

app.get('/api/faltas/count', (req, res) => {
  db.get('SELECT COUNT(*) as total FROM faltas', (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ total: row.total });
  });
});

app.get('/api/faltas/count/by-materia', (req, res) => {
  const query = `
    SELECT m.id, m.nome, COUNT(f.id) as total
    FROM materias m
    LEFT JOIN faltas f ON m.id = f.materia_id
    GROUP BY m.id, m.nome
    ORDER BY m.nome
  `;
  db.all(query, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/api/faltas', (req, res) => {
  const { data, materia_id, observacao } = req.body;
  if (!data || !materia_id) {
    return res.status(400).json({ error: 'Data e matéria são obrigatórios' });
  }
  db.run(
    'INSERT INTO faltas (data, materia_id, observacao) VALUES (?, ?, ?)',
    [data, materia_id, observacao || null],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, data, materia_id, observacao: observacao || null });
    }
  );
});

app.put('/api/faltas/:id', (req, res) => {
  const { id } = req.params;
  const { data, materia_id, observacao } = req.body;
  if (!data || !materia_id) {
    return res.status(400).json({ error: 'Data e matéria são obrigatórios' });
  }
  db.run(
    'UPDATE faltas SET data = ?, materia_id = ?, observacao = ? WHERE id = ?',
    [data, materia_id, observacao || null, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Falta não encontrada' });
      }
      res.json({ id, data, materia_id, observacao: observacao || null });
    }
  );
});

app.delete('/api/faltas/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM faltas WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Falta não encontrada' });
    }
    res.json({ message: 'Falta registrada removida com sucesso' });
  });
});

app.delete('/api/materias/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM materias WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Matéria não encontrada' });
    }
    res.json({ message: 'Matéria removida com sucesso' });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});