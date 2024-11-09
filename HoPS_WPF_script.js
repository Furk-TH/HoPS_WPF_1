document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM vollständig geladen und analysiert.");

    let currentUser = null;
    const wpfList = []; // Array zum Speichern der WPF-Informationen

    // Zeiten und Wochentage definieren
    const times = [
        "08:30 - 09:00",
        "09:00 - 10:00",
        "10:00 - 11:00",
        "11:00 - 12:00",
        "12:00 - 13:00",
        "13:00 - 14:00",
        "14:00 - 15:00",
        "15:00 - 16:00"
    ];

    const stundenplanBody = document.getElementById('stundenplan-body');

    // Zeilen für jede Zeit erstellen
    times.forEach(time => {
        const row = document.createElement('tr');

        // Erste Zelle: Zeit
        const timeCell = document.createElement('td');
        timeCell.className = 'time';
        timeCell.textContent = time;
        row.appendChild(timeCell);

        // Fünf Zellen für die Wochentage erstellen
        for (let i = 0; i < 5; i++) {
            const cell = document.createElement('td');
            cell.classList.add('schedule-cell');
            cell.wpfEntries = []; // Array zur Speicherung mehrerer WPFs pro Zelle
            cell.addEventListener('click', () => handleCellClick(cell));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                deleteSubject(cell);
            });
            row.appendChild(cell);
        }

        // Zeile zum Stundenplan hinzufügen
        stundenplanBody.appendChild(row);
    });

    // Event-Listener für Login und Logout
    document.getElementById('loginButton').addEventListener('click', handleLoginLogout);
    document.getElementById("loginForm").addEventListener("submit", login);
    document.getElementById("registerForm").addEventListener("submit", register);

    // Event-Listener für Register-Button (öffnet Modal)
    document.getElementById('registerButton').addEventListener('click', function () {
        document.getElementById('registerModal').style.display = 'block';
    });

    // Logout und Login
    function handleLoginLogout() {
        const button = document.getElementById('loginButton');
        if (button.innerText === 'Log In') {
            document.getElementById('loginModal').style.display = 'block';
        } else {
            alert('Sie wurden ausgeloggt.');
            currentUser = null;
            button.innerText = 'Log In';
            document.getElementById('userRole').innerText = '';
        }
    }

    function login(event) {
        event.preventDefault();
        
        const username = document.getElementById("uname").value;
        const password = document.getElementById("psw").value;
        
        fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentUser = data.user;
                document.getElementById('loginButton').innerText = 'Log Out';
                document.getElementById('userRole').innerText = `Rolle: ${currentUser.role}`;
                
                // Schließe das Login-Modal bei erfolgreichem Login
                document.getElementById('loginModal').style.display = 'none';
                
                // Zeige die Erfolgsmeldung im Browser als Pop-up
                alert(`Erfolgreich eingeloggt! Willkommen, ${username}.`);
                
            } else {
                alert("Ungültige Anmeldedaten.");
            }
        })
        .catch(error => console.error("Fehler beim Login:", error));
    }    

    // Registrierung
    function register(event) {
        event.preventDefault();
        const username = document.getElementById("regUname").value;
        const password = document.getElementById("regPsw").value;
        const email = document.getElementById("regEmail").value;
        const role = document.querySelector('input[name="role"]:checked').value;

        fetch("http://localhost:3000/add-data", { // Backend-Route zum Speichern der Daten
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password, email, role })
        })
        .then(response => response.text())
        .then(data => {
            alert("Benutzer erfolgreich registriert und in Google Sheets gespeichert.");
            document.getElementById('registerModal').style.display = 'none';
        })
        .catch(error => console.error("Fehler beim Speichern der Daten:", error));
    }

    // Funktionen zum Bearbeiten der Zellen
    function handleCellClick(cell) {
        if (currentUser && currentUser.role === 'Professor') {
            createWPF(cell);
        } else if (currentUser && currentUser.role === 'Student') {
            registerOrUnregisterForWPF(cell);
        } else {
            alert("Bitte loggen Sie sich als Professor oder Student ein.");
        }
    }

    // Restliche Funktionen (z.B. createWPF, registerOrUnregisterForWPF) bleiben unverändert


    function createWPF(cell) {
        const moduleName = prompt('Geben Sie das Modul ein:').trim();
        if (!moduleName) return;
    
        const room = prompt('Geben Sie die Raum-Nummer ein:').trim();
        if (!room) return;
    
        const professor = prompt('Geben Sie den Namen des Professors ein:').trim();
        if (!professor) return;
    
        const maxParticipants = parseInt(prompt('Geben Sie die maximale Teilnehmeranzahl ein:'), 10);
        if (isNaN(maxParticipants) || maxParticipants <= 0) return;
    
        fetch("http://localhost:3000/add-wpf", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ moduleName, room, professor, maxParticipants })
        })
        .then(response => response.text())
        .then(data => {
            alert("WPF erfolgreich gespeichert");
        })
        .catch(error => console.error("Fehler beim Speichern des WPFs:", error));
    
        // Neues WPF-Objekt erstellen
        const wpf = {
            moduleName,
            room,
            professor,
            maxParticipants,
            currentParticipants: 0,
            students: []
        };
        wpfList.push(wpf);

        // WPF zur Zellliste hinzufügen und anzeigen
        cell.wpfEntries.push(wpf);
        updateCellDisplay(cell); // Aktualisiert die Zelle mit allen WPFs in der Zelle
    }

    function registerOrUnregisterForWPF(cell) {
        if (cell.wpfEntries.length === 0) {
            alert("Kein WPF zur Anmeldung vorhanden.");
            return;
        }

        const moduleName = prompt("Geben Sie den Namen des Moduls ein, für das Sie sich anmelden oder abmelden möchten:");
        const wpf = cell.wpfEntries.find(w => w.moduleName === moduleName);
        if (!wpf) {
            alert("WPF nicht gefunden.");
            return;
        }

        if (wpf.students.includes(currentUser.username)) {
            // Der Benutzer ist bereits angemeldet, Abmeldung ermöglichen
            const confirm = prompt(`Möchten Sie sich von ${moduleName} abmelden? Geben Sie "Ja" ein, um zu bestätigen.`);
            if (confirm && confirm.toLowerCase() === "ja") {
                wpf.students = wpf.students.filter(student => student !== currentUser.username);
                wpf.currentParticipants--;
                alert(`Sie haben sich erfolgreich von ${moduleName} abgemeldet.`);
                updateCellDisplay(cell); // Aktualisiert die Anzeige in der Zelle
            }
        } else {
            // Der Benutzer ist nicht angemeldet, Anmeldung ermöglichen
            if (wpf.currentParticipants >= wpf.maxParticipants) {
                alert("Keine freien Plätze mehr.");
                return;
            }

            const confirm = prompt(`Möchten Sie sich für ${moduleName} anmelden? Geben Sie "Ja" ein, um zu bestätigen.`);
            if (confirm && confirm.toLowerCase() === "ja") {
                wpf.students.push(currentUser.username);
                wpf.currentParticipants++;
                alert(`Sie haben sich erfolgreich für ${moduleName} angemeldet.`);
                updateCellDisplay(cell); // Aktualisiert die Anzeige in der Zelle
            }
        }
    }


    function updateCellDisplay(cell) {
        cell.innerHTML = '';
        cell.wpfEntries.forEach(wpf => {
            const entry = document.createElement("div");
            entry.classList.add("subject-entry");
            entry.innerHTML = `<strong>${wpf.moduleName}</strong><br>
                Raum: ${wpf.room}<br>
                Professor: ${wpf.professor}<br>
                Plätze: ${wpf.currentParticipants}/${wpf.maxParticipants}`;
            cell.appendChild(entry);
        });
    }

    function deleteSubject(cell) {
        if (currentUser && currentUser.role === 'Professor') {
            const moduleName = prompt("Geben Sie den Namen des Fachs ein, das Sie löschen möchten:");
            const index = cell.wpfEntries.findIndex(w => w.moduleName === moduleName);
            if (index !== -1) {
                cell.wpfEntries.splice(index, 1); // Entfernt das WPF aus der Zellliste
                updateCellDisplay(cell); // Aktualisiert die Anzeige
            } else {
                alert("Fach nicht gefunden.");
            }
        } else {
            alert("Nur Professoren können Fächer löschen.");
        }
    }

    document.getElementById("downloadButton").addEventListener("click", async function downloadPDF() {
        if (!currentUser) {
            alert('Bitte loggen Sie sich ein, um den Stundenplan herunterzuladen.');
            return;
        }
    
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        const stundenplan = document.getElementById('stundenplan');
    
        if (!stundenplan) {
            console.error("Stundenplan-Element nicht gefunden.");
            return;
        }
    
        // Nimmt ein Screenshot des Stundenplans mit html2canvas
        const canvas = await html2canvas(stundenplan);
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
        pdf.save('stundenplan.pdf');
    });
    
});