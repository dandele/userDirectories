// Funzioni per gestire la visualizzazione del pulsante di logout nella navbar
function showNavbarLogoutButton() {
  const navbarLogoutButton = document.getElementById('navbarLogoutButton');
  if (navbarLogoutButton) {
    navbarLogoutButton.classList.remove('hidden');
    navbarLogoutButton.addEventListener('click', () => {
      window.location.href = '/logout';
    });
  }
}

function hideNavbarLogoutButton() {
  const navbarLogoutButton = document.getElementById('navbarLogoutButton');
  if (navbarLogoutButton) {
    navbarLogoutButton.classList.add('hidden');
  }
}

// Quando il documento è pronto, verifica se l'utente è autenticato e carica l'elenco dei database
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('/api/databases');
    if (response.status === 401) {
      // Se non autenticato, mostra il pulsante di login
      renderLogin();
    } else {
      const databases = await response.json();
      console.log('Databases fetched on load:', databases); // Log dei database ricevuti
      renderDatabaseList(databases);
    }
  } catch (error) {
    console.error('Errore durante il caricamento dei database:', error);
  }
});

// Funzione per visualizzare il pulsante di login
function renderLogin() {
  hideNavbarLogoutButton();
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = `
    <div class="flex flex-col items-center">
      <h1 class="text-4xl font-bold mb-6 text-primary">Benvenuto in NotionApp</h1>
      <p class="mb-6 text-gray-700">Accedi con il tuo account Notion per visualizzare i tuoi database.</p>
      <a href="/auth/notion" class="bg-primary hover:bg-primary-light text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1">
        Accedi con Notion
      </a>
    </div>
  `;
}

// Funzione per visualizzare l'elenco dei database
function renderDatabaseList(databases) {
  showNavbarLogoutButton();
  console.log('Databases:', databases); // Log dei database
  sessionStorage.setItem('databases', JSON.stringify(databases));
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = `
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-800">Seleziona un Database</h1>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${databases.map(db => `
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">${db.title && db.title[0]?.plain_text || 'Senza titolo'}</h2>
          <button class="bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:-translate-y-1" data-id="${db.id}">
            Visualizza Database
          </button>
        </div>
      `).join('')}
    </div>
  `;

  // Aggiungi event listener ai bottoni per ogni database
  const buttons = appDiv.querySelectorAll('button[data-id]');
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const databaseId = button.getAttribute('data-id');
      fetchDatabaseData(databaseId);
    });
  });
}

// Funzione per recuperare i dati di un database selezionato
async function fetchDatabaseData(databaseId) {
  try {
    const response = await fetch(`/api/databases/${databaseId}`);
    const data = await response.json();
    console.log('Dati ricevuti dal database:', data); // Log dei dati ricevuti
    renderDataView(data);
  } catch (error) {
    console.error('Errore durante il recupero dei dati del database:', error);
    renderError('Si è verificato un errore durante il recupero dei dati del database.');
  }
}

// Funzione per visualizzare i dati e gestire la vista
function renderDataView(data) {
  console.log('Rendering data view with data:', data); // Log dei dati da visualizzare

  const dataArray = data.results || data; // Usa data.results se esiste, altrimenti data

  const appDiv = document.getElementById('app');
  appDiv.innerHTML = `
    <div class="flex justify-between items-center mb-6">
      <div>
        <button id="backButton" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out transform hover:-translate-y-1">
          Indietro
        </button>
        <button id="toggleView" class="bg-primary hover:bg-primary-light text-white font-bold py-2 px-4 rounded ml-2 transition duration-300 ease-in-out transform hover:-translate-y-1">
          Cambia Vista
        </button>
      </div>
    </div>
    <div id="dataView"></div>
  `;

  let currentView = 'table';
  renderTableView(dataArray);

  // Event listener per tornare all'elenco dei database
  document.getElementById('backButton').addEventListener('click', () => {
    const databases = JSON.parse(sessionStorage.getItem('databases'));
    renderDatabaseList(databases);
  });

  // Event listener per cambiare la vista tra tabella e galleria
  document.getElementById('toggleView').addEventListener('click', () => {
    currentView = currentView === 'table' ? 'gallery' : 'table';
    if (currentView === 'table') {
      renderTableView(dataArray);
    } else {
      renderGalleryView(dataArray);
    }
  });
}

// Funzione per visualizzare i dati in una tabella
function renderTableView(data) {
  console.log('Rendering table view with data:', data); // Log dei dati per la tabella

  const dataView = document.getElementById('dataView');
  dataView.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    dataView.innerHTML = '<p>Nessun dato disponibile.</p>';
    return;
  }

  const table = document.createElement('table');
  table.classList.add('min-w-full', 'bg-white', 'rounded-lg', 'overflow-hidden', 'shadow-lg');

  const thead = document.createElement('thead');
  thead.classList.add('bg-primary', 'text-white');

  const headerRow = document.createElement('tr');

  // Ottieni tutte le proprietà dai dati
  const allProperties = new Set();
  data.forEach(item => {
    Object.keys(item.properties).forEach(prop => {
      allProperties.add(prop);
    });
  });
  const properties = Array.from(allProperties);
  console.log('Properties:', properties); // Log delle proprietà

  properties.forEach(prop => {
    const th = document.createElement('th');
    th.textContent = prop;
    th.classList.add('px-6', 'py-3', 'text-left', 'text-xs', 'font-medium', 'uppercase', 'tracking-wider');
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.classList.add('divide-y', 'divide-gray-200');

  data.forEach(item => {
    const row = document.createElement('tr');
    row.classList.add('hover:bg-gray-100');

    properties.forEach(prop => {
      const td = document.createElement('td');
      td.classList.add('px-6', 'py-4', 'whitespace-nowrap', 'text-sm', 'text-gray-700');

      const property = item.properties[prop];
      const value = parsePropertyValue(property);
      td.textContent = value;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  dataView.appendChild(table);
}

// Funzione per visualizzare i dati in una galleria
function renderGalleryView(data) {
  console.log('Rendering gallery view with data:', data); // Log dei dati per la galleria

  const dataView = document.getElementById('dataView');
  dataView.innerHTML = '';

  if (!Array.isArray(data) || data.length === 0) {
    dataView.innerHTML = '<p>Nessun dato disponibile.</p>';
    return;
  }

  const gallery = document.createElement('div');
  gallery.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');

  data.forEach(item => {
    console.log('Item:', item); // Log dell'elemento corrente

    const card = document.createElement('div');
    card.classList.add('bg-white', 'rounded-lg', 'overflow-hidden', 'shadow-lg', 'transform', 'hover:scale-105', 'transition', 'duration-300', 'ease-in-out');

    // Trova la proprietà di tipo 'title' per il titolo
    let titleProperty;
    for (const key in item.properties) {
      if (item.properties[key].type === 'title') {
        titleProperty = item.properties[key];
        break;
      }
    }
    console.log('Title property:', titleProperty);

    const title = document.createElement('h2');
    title.textContent = parsePropertyValue(titleProperty) || 'Senza titolo';
    console.log('Parsed title:', title.textContent);
    title.classList.add('font-bold', 'text-xl', 'mb-2');

    // Cerca l'immagine
    let imageUrl;
    for (const key in item.properties) {
      const property = item.properties[key];
      if (property.type === 'files' && property.files.length > 0) {
        const file = property.files[0];
        imageUrl = file.type === 'external' ? file.external.url : file.file.url;
        break;
      } else if (property.type === 'url' && property.url) {
        imageUrl = property.url;
        break;
      }
    }

    // Crea l'elemento immagine se abbiamo un URL
    if (imageUrl) {
      const image = document.createElement('img');
      image.src = imageUrl;
      image.alt = title.textContent || 'Immagine';
      image.classList.add('w-full', 'h-48', 'object-cover', 'mb-4');
      card.appendChild(image);
    }

    // Crea il contenitore per il contenuto
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('p-4');

    contentContainer.appendChild(title);

    // Aggiungi altre proprietà come contenuto
    const content = document.createElement('div');
    content.classList.add('text-gray-700', 'text-base');
    for (const key in item.properties) {
      if (item.properties[key] !== titleProperty) {
        const propName = key;
        const propValue = parsePropertyValue(item.properties[key]);
        if (propValue) {
          const propElement = document.createElement('p');
          propElement.innerHTML = `<strong>${propName}:</strong> ${propValue}`;
          content.appendChild(propElement);
        }
      }
    }
    console.log('Parsed content:', content.innerHTML);

    contentContainer.appendChild(content);
    card.appendChild(contentContainer);
    gallery.appendChild(card);
  });

  dataView.appendChild(gallery);
}

// Funzione per interpretare il valore delle proprietà in base al tipo
function parsePropertyValue(property) {
  if (!property) {
    console.log('Property is undefined or null.');
    return '';
  }
  console.log('Parsing property:', property); // Log della proprietà in fase di parsing

  switch (property.type) {
    case 'title':
      return property.title.map(part => part.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text.map(part => part.plain_text).join('') || '';
    case 'number':
      return property.number !== null ? property.number : '';
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select.map(select => select.name).join(', ');
    case 'date':
      if (property.date) {
        if (property.date.start && property.date.end) {
          return `${property.date.start} - ${property.date.end}`;
        }
        return property.date.start || '';
      }
      return '';
    case 'checkbox':
      return property.checkbox ? '✅' : '❌';
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    case 'formula':
      return parsePropertyValue(property.formula);
    case 'rollup':
      if (property.rollup.array) {
        return property.rollup.array.map(item => parsePropertyValue(item)).join(', ');
      }
      return parsePropertyValue(property.rollup);
    case 'people':
      return property.people.map(person => person.name).join(', ');
    case 'files':
      return property.files.map(file => file.name || file.external.url).join(', ');
    case 'relation':
      return property.relation.map(rel => rel.id).join(', ');
    default:
      console.log('Unhandled property type:', property.type);
      return '';
  }
}

// Funzione per visualizzare un messaggio di errore
function renderError(message) {
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = `
    <div class="text-red-500">
      <p>${message}</p>
    </div>
  `;
}
