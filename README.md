# Galería de Medios - Google Drive

Una aplicación web moderna para visualizar y organizar imágenes y videos desde Google Drive con un visor modal elegante.

## 🎨 Características

- ✅ Conexión con Google Drive API
- ✅ **Navegación por categorías**: Fotos y Videos organizados
- ✅ **Lazy Loading**: Carga optimizada de imágenes
- ✅ Visualización de imágenes y videos
- ✅ Modal flotante con fondo oscurecido
- ✅ Diseño responsivo
- ✅ Paleta de colores cálidos inspirada en atardecer
- ✅ Interfaz moderna y elegante
- ✅ Subcategorías personalizadas por tipo de contenido

## 🚀 Configuración

### Paso 1: Crear proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Drive API**:
   - Ve a "APIs & Services" > "Library"
   - Busca "Google Drive API"
   - Haz clic en "Enable"

### Paso 2: Crear credenciales

#### API Key:
1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "API Key"
3. Copia la API Key generada
4. (Opcional) Restringe la API Key a "Google Drive API"

#### OAuth 2.0 Client ID:
1. Ve a "APIs & Services" > "Credentials"
2. Haz clic en "Create Credentials" > "OAuth client ID"
3. Si es necesario, configura la pantalla de consentimiento OAuth:
   - Ve a "OAuth consent screen"
   - Selecciona "External" (o "Internal" si es para tu organización)
   - Completa la información requerida
   - Agrega el scope: `https://www.googleapis.com/auth/drive.readonly`
4. Selecciona "Web application" como tipo de aplicación
5. Agrega los orígenes autorizados de JavaScript:
   - `http://localhost:8000` (para desarrollo local)
   - Tu dominio de producción (si aplica)
6. Copia el **Client ID** generado

### Paso 3: Configurar credenciales

1. Abre el archivo `app.js`
2. Reemplaza las siguientes líneas con tus credenciales:

```javascript
const CLIENT_ID = 'TU_CLIENT_ID_AQUI';  // Pega tu Client ID aquí
const API_KEY = 'TU_API_KEY_AQUI';      // Pega tu API Key aquí
```

### Paso 4: Configurar IDs de carpetas de Google Drive

**IMPORTANTE**: Necesitas obtener los IDs de tus carpetas de Google Drive.

#### Cómo obtener el ID de una carpeta:
1. Abre Google Drive en tu navegador
2. Navega a la carpeta que deseas usar
3. Mira la URL en la barra de direcciones:
   ```
   https://drive.google.com/drive/folders/1a2B3c4D5e6F7g8H9i0J
                                          ^^^^^^^^^^^^^^^^^^^
                                          Este es el Folder ID
   ```
4. Copia el ID (la parte después de `/folders/`)

#### Configurar config.js:

Abre el archivo `config.js` y reemplaza los IDs de carpeta según tu estructura:

```javascript
const FOLDER_CONFIG = {
    fotos: {
        folderId: 'ID_DE_TU_CARPETA_FOTOS',  // ID de la carpeta "Fotos"
        subcategories: {
            'editadas': {
                folderId: 'ID_CARPETA_EDITADAS',  // ID de "Fotos/Editadas"
                name: 'Editadas'
            },
            'seleccionadas': {
                folderId: 'ID_CARPETA_SELECCIONADAS',  // ID de "Fotos/Seleccionadas"
                name: 'Seleccionadas'
            },
            'sin-editar': {
                folderId: 'ID_CARPETA_SIN_EDITAR',  // ID de "Fotos/Sin Editar"
                name: 'Sin Editar'
            }
        }
    },
    videos: {
        folderId: 'ID_DE_TU_CARPETA_VIDEOS',  // ID de la carpeta "Videos"
        subcategories: {
            'comercial': {
                folderId: 'ID_CARPETA_COMERCIAL',  // ID de "Videos/Comercial"
                name: 'Comercial'
            },
            'detras-camara': {
                folderId: 'ID_CARPETA_DETRAS_CAMARA',  // ID de "Videos/Detrás de Cámara"
                name: 'Detrás de Cámara'
            },
            'rafiela': {
                folderId: 'ID_CARPETA_RAFIELA',  // ID de "Videos/Rafiela"
                name: 'Rafiela'
            }
        }
    }
};
```

### Paso 5: Ejecutar la aplicación

La aplicación debe ejecutarse en un servidor web. **No funcionará abriendo el archivo HTML directamente.**

#### Opción 1: Python (recomendado)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Opción 2: Node.js (http-server)
```bash
npx http-server -p 8000
```

#### Opción 3: PHP
```bash
php -S localhost:8000
```

#### Opción 4: Visual Studio Code
- Instala la extensión "Live Server"
- Haz clic derecho en `index.html` > "Open with Live Server"

### Paso 6: Abrir en el navegador

1. Abre tu navegador
2. Ve a `http://localhost:8000`
3. Haz clic en "Conectar con Google Drive"
4. Autoriza el acceso a tu Google Drive
5. ¡Disfruta explorando tus medios!

## 📁 Estructura del Proyecto

```
pagina-web-gala/
├── index.html          # Estructura HTML con navegación por categorías
├── styles.css          # Estilos con paleta de colores cálidos
├── app.js             # Lógica de la aplicación y API de Google Drive
├── config.js          # Configuración de IDs de carpetas
└── README.md          # Este archivo
```

## 📂 Estructura de Carpetas en Google Drive

La aplicación está diseñada para la siguiente estructura:

```
Proyecto Gala 5to/
├── Fotos/
│   ├── Editadas/
│   │   ├── Comida/
│   │   ├── Lugares/
│   │   ├── Mercado/
│   │   ├── Otros/
│   │   ├── Pacas/
│   │   └── Plantaciones/
│   ├── Seleccionadas/
│   └── Sin Editar/
└── Videos/
    ├── Comercial/
    ├── Detrás de Cámara/
    └── Rafiela/
```

## 🎨 Paleta de Colores

La aplicación utiliza una paleta de colores cálidos inspirada en un atardecer:

- **Lightest**: `#F5E6D3` - Crema claro
- **Light**: `#E8C9A0` - Beige dorado
- **Medium**: `#D9935E` - Naranja suave
- **Dark**: `#B8632F` - Naranja oscuro
- **Darkest**: `#3D2817` - Marrón oscuro

## 🔧 Funcionalidades

### Navegación por Categorías
- **Inicio**: Vista principal con acceso a Fotos y Videos
- **Fotos**: Accede a Editadas, Seleccionadas y Sin Editar
- **Videos**: Accede a Comercial, Detrás de Cámara y Rafiela
- Usa el botón "← Inicio" para volver a la página principal
- Navegación rápida con botones en la parte superior

### Lazy Loading
- Las imágenes se cargan automáticamente cuando aparecen en pantalla
- Mejora el rendimiento y reduce el uso de datos
- Experiencia de navegación más fluida

### Visualización de Medios
- Haz clic en cualquier imagen o video para abrirlo en el modal
- El modal muestra el archivo en tamaño completo
- Cierra el modal haciendo clic en:
  - El botón "×" en la esquina superior derecha
  - Fuera del contenido del modal
  - Presionando la tecla "Esc"

### Tipos de Archivos Soportados
- **Imágenes**: JPG, PNG, GIF, BMP, WebP, SVG, etc.
- **Videos**: MP4, WebM, MOV, AVI, etc.

## 🔒 Seguridad

- La aplicación solo solicita permisos de **lectura** (`drive.readonly`)
- No puede modificar, eliminar o crear archivos en tu Drive
- Las credenciales se mantienen en el navegador y no se envían a ningún servidor externo

## 🐛 Solución de Problemas

### Error: "Origin mismatch"
- Asegúrate de que la URL en tu navegador coincida con los orígenes autorizados en Google Cloud Console
- Verifica que estés usando `http://localhost:8000` y no `http://127.0.0.1:8000`

### No se cargan las imágenes/videos
- Verifica que tu API Key y Client ID sean correctos
- Asegúrate de haber habilitado la Google Drive API
- Revisa la consola del navegador para ver errores específicos

### "Access blocked: This app's request is invalid"
- Completa la configuración de la pantalla de consentimiento OAuth
- Agrega tu email como usuario de prueba si la app está en modo "Testing"

### Los videos no se reproducen
- Algunos formatos de video pueden no ser compatibles con el navegador
- Intenta con archivos MP4 o WebM para mejor compatibilidad

## 📱 Responsividad

La aplicación está optimizada para:
- 💻 Escritorio (1400px+)
- 📱 Tablets (768px - 1400px)
- 📱 Móviles (< 768px)

## 🌐 Navegadores Compatibles

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## 📝 Notas Adicionales

- La aplicación carga hasta 100 archivos por carpeta
- Los archivos se ordenan por tipo (carpetas primero) y luego por nombre
- Las miniaturas se cargan de forma diferida (lazy loading) para mejor rendimiento
- Los archivos en la papelera de Google Drive no se muestran

## ⚙️ Personalización

### Agregar más subcategorías

Puedes agregar más subcategorías editando `config.js` y agregando las carpetas correspondientes en el HTML.

### Cambiar colores

Edita las variables CSS en `styles.css`:

```css
:root {
    --color-lightest: #F5E6D3;
    --color-light: #E8C9A0;
    --color-medium: #D9935E;
    --color-dark: #B8632F;
    --color-darkest: #3D2817;
}
```

## 🎯 Próximas Mejoras Sugeridas

- [ ] Búsqueda de archivos
- [ ] Filtros por tipo de archivo
- [ ] Ordenamiento personalizado
- [ ] Descarga de archivos
- [ ] Presentación de diapositivas
- [ ] Compartir enlaces
- [ ] Paginación para carpetas con muchos archivos

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y comercial.

---

¡Disfruta de tu galería de medios! 🎉
