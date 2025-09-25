<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Planilha de Recebimentos</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Planilha de Recebimentos</h1>
            <div class="user-info">
                <span id="welcomeMessage"></span> |
                <span>Dados de Recebimento</span> |
                <a href="dashboard.html" style="color: white;">Voltar ao Painel</a>
                <a href="#" onclick="auth.logout()" style="color: white; margin-left: 10px;">Sair</a>
            </div>
        </div>
        
        <div class="card">
            <h2>Filtros</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                <div class="form-group" style="flex-grow: 1;">
                    <label for="filterList">Nº da Lista:</label>
                    <input type="text" id="filterList" placeholder="Pesquisar por Nº da Lista">
                </div>
                <div class="form-group" style="flex-grow: 1;">
                    <label for="filterDays">Prazo:</label>
                    <select id="filterDays">
                        <option value="">Todos</option>
                        <option value="0 a 5 dias">0 a 5 dias</option>
                        <option value="6 a 10 dias">6 a 10 dias</option>
                        <option value="11 a 15 dias">11 a 15 dias</option>
                        <option value="16 a 30 dias">16 a 30 dias</option>
                        <option value="31 a 60 dias">31 a 60 dias</option>
                        <option value="61 a 90 dias">61 a 90 dias</option>
                        <option value="91 a 120 dias">91 a 120 dias</option>
                        <option value="Maior que 120 dias">Maior que 120 dias</option>
                    </select>
                </div>
                <div class="form-group" style="flex-grow: 1;">
                    <label for="filterLocation">Local:</label>
                    <input type="text" id="filterLocation" placeholder="Pesquisar por Local">
                </div>
            </div>
            <div style="text-align: right; margin-top: 10px;">
                <button class="btn btn-primary" onclick="exportToExcel()">Exportar para Excel</button>
            </div>
        </div>
        
        <div class="card">
            <h2>Dados</h2>
            <table id="dataTable" class="data-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Prazo</th>
                        <th>Nº da Lista</th>
                        <th>Local</th>
                        <th>Recebido por</th>
                        <th>Observações</th>
                        <th>Validade</th> <!-- Novo cabeçalho -->
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="dataBody">
                    <!-- Dados serão inseridos aqui -->
                </tbody>
            </table>
        </div>

        <!-- Modal para Log de Modificações -->
        <div id="logModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <h3>Histórico de Modificações</h3>
                <div id="logContent"></div>
            </div>
        </div>
    </div>
    
    <script src="script.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            auth.init();
            dataManager.init();
        });

        const dataManager = {
            allData: [],
            visibleData: [],
            init: () => {
                dataManager.loadData();
                dataManager.setupFilters();
            },
            loadData: () => {
                dataManager.allData = dataManager.getEntries();
                dataManager.renderTable();
            },
            getEntries: () => {
                const rawData = getStorage('receipts');
                // Adiciona um campo de log vazio se não existir
                return rawData.map(entry => ({ ...entry, log: entry.log || [] }));
            },
            addEntry: (newEntry) => {
                let data = dataManager.getEntries();
                data.unshift(newEntry);
                setStorage('receipts', data);
                dataManager.loadData();
            },
            updateEntry: (index, updatedEntry) => {
                let data = dataManager.getEntries();
                data[index] = updatedEntry;
                setStorage('receipts', data);
                dataManager.loadData();
            },
            deleteEntry: (index) => {
                let data = dataManager.getEntries();
                data.splice(index, 1);
                setStorage('receipts', data);
                dataManager.loadData();
            },
            setupFilters: () => {
                document.getElementById('filterList').addEventListener('input', dataManager.applyFilters);
                document.getElementById('filterDays').addEventListener('change', dataManager.applyFilters);
                document.getElementById('filterLocation').addEventListener('input', dataManager.applyFilters);
            },
            applyFilters: () => {
                const filterList = document.getElementById('filterList').value.toLowerCase();
                const filterDays = document.getElementById('filterDays').value;
                const filterLocation = document.getElementById('filterLocation').value.toLowerCase();

                dataManager.visibleData = dataManager.allData.filter(entry => {
                    const matchesList = entry.listNumber.toLowerCase().includes(filterList);
                    const matchesDays = filterDays === '' || getDaysCategory(calculateDays(entry.receiptDate)) === filterDays;
                    const matchesLocation = entry.location.toLowerCase().includes(filterLocation);

                    return matchesList && matchesDays && matchesLocation;
                });
                dataManager.renderTable(dataManager.visibleData);
            },
            renderTable: (data = dataManager.allData) => {
                const dataBody = document.getElementById('dataBody');
                if (!dataBody) return;
                dataBody.innerHTML = '';

                data.forEach((entry, index) => {
                    const row = dataBody.insertRow();
                    row.innerHTML = `
                        <td contenteditable="true" onblur="dataManager.handleCellEdit(${index}, 'receiptDate', this.innerText)">${entry.receiptDate}</td>
                        <td>${getDaysCategory(calculateDays(entry.receiptDate))}</td>
                        <td contenteditable="true" onblur="dataManager.handleCellEdit(${index}, 'listNumber', this.innerText)">${entry.listNumber}</td>
                        <td contenteditable="true" onblur="dataManager.handleCellEdit(${index}, 'location', this.innerText)">${entry.location}</td>
                        <td contenteditable="true" onblur="dataManager.handleCellEdit(${index}, 'receivedBy', this.innerText)">${entry.receivedBy}</td>
                        <td contenteditable="true" onblur="dataManager.handleCellEdit(${index}, 'obs', this.innerText)">${entry.obs}</td>
                        <td contenteditable="true" onblur="dataManager.handleCellEdit(${index}, 'validityDate', this.innerText)">${entry.validityDate || ''}</td>
                        <td>
                            <button class="btn btn-secondary" onclick="dataManager.showLog(${index})">Log</button>
                            <button class="btn btn-danger" onclick="dataManager.confirmDelete(${index})">Excluir</button>
                        </td>
                    `;
                });
            },
            handleCellEdit: (index, field, newValue) => {
                const entry = dataManager.allData[index];
                const oldValue = entry[field];
                const date = new Date().toISOString();
                const user = auth.getCurrentUser()?.username || 'unknown';

                if (oldValue !== newValue) {
                    const changes = `[${date}] Usuário: ${user} - Campo '${field}' alterado de '${oldValue}' para '${newValue}'.`;
                    
                    const updatedEntry = {
                        ...entry,
                        [field]: newValue,
                        log: [...entry.log, { date, changes }]
                    };
                    dataManager.updateEntry(index, updatedEntry);
                }
            },
            showLog: (index) => {
                const entry = dataManager.allData[index];
                const logContent = document.getElementById('logContent');
                logContent.innerHTML = '';
                
                if (entry.log && entry.log.length > 0) {
                    entry.log.forEach(log => {
                        logContent.innerHTML += `
                            <p><strong>${new Date(log.date).toLocaleString()}</strong></p>
                            <pre>${log.changes}</pre>
                            <hr>
                        `;
                    });
                } else {
                    logContent.textContent = 'Nenhuma modificação registrada.';
                }

                document.getElementById('logModal').style.display = 'flex';
            },
            closeModal: () => {
                document.getElementById('logModal').style.display = 'none';
            },
            confirmDelete: (index) => {
                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3>Confirmar Exclusão</h3>
                        <p>Tem certeza que deseja excluir este registro?</p>
                        <div style="text-align: right; margin-top: 20px;">
                            <button class="btn btn-danger" onclick="dataManager.deleteEntry(${index}); modal.remove();">Sim, Excluir</button>
                            <button class="btn btn-secondary" onclick="modal.remove();">Cancelar</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                modal.style.display = 'flex';
            },
            exportToExcel: () => {
                const dataToExport = dataManager.visibleData.length > 0 ? dataManager.visibleData : dataManager.allData;
                
                const worksheetData = dataToExport.map(entry => {
                    const daysCategory = getDaysCategory(calculateDays(entry.receiptDate));
                    return [
                        entry.receiptDate,
                        daysCategory,
                        entry.listNumber,
                        entry.location,
                        entry.receivedBy,
                        entry.obs,
                        entry.validityDate || ''
                    ];
                });

                const headers = [
                    "Data", "Prazo", "Nº da Lista", "Local", "Recebido por", "Observações", "Validade"
                ];

                const finalData = [headers, ...worksheetData];
                
                const ws = XLSX.utils.aoa_to_sheet(finalData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Recebimentos");
                XLSX.writeFile(wb, "recebimentos.xlsx");
            }
        };

        const exportToExcel = dataManager.exportToExcel;
        const closeModal = dataManager.closeModal;
    </script>
</body>
</html>
