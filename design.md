# Manual de Identidad y Bases de Diseño — Mi Wawita

Este documento establece las bases de diseño visual y de experiencia de usuario (UI/UX) para **Mi Wawita**. Nuestro objetivo es encontrar el **punto medio óptimo**: una interfaz que transmita la calidez y ternura de la educación inicial, pero que mantenga la limpieza, ligereza y legibilidad de una herramienta profesional de trabajo para docentes, evitando sombras o relieves exagerados.

---

## 1. Filosofía de Diseño: "Minimalismo Cálido e Infantil"

Buscamos una estética que se sienta **cercana y lúdica** pero **limpia y moderna**. Evitamos dos extremos:
*   **Evitar el extremo corporativo/plano:** Que se sienta frío, rígido o como un software de oficina.
*   **Evitar el extremo del juego infantil (Skeuomorphism/Claymorphism exagerado):** Sin anillas realistas, sin texturas de papel arrugado, y sin sombras tridimensionales pesadas que saturen la pantalla y dificulten la lectura.

### El Punto Medio
La metáfora de "cuaderno de campo" se logra mediante la estructura:
*   **Separadores limpios:** Pestañas laterales de navegación que actúan como pestañas de índice.
*   **Hojas limpias:** Superficies blancas con abundante aire y esquinas redondeadas suaves (`rounded-2xl`).
*   **Líneas de pliegue sutiles:** Bordes finos y sombras muy tenues que sugieren capas de papel sin crear volumen exagerado.

---

## 2. Paleta de Colores y Accesibilidad

Utilizamos colores pasteles infantiles pero en un formato que garantice el contraste mínimo de accesibilidad (**WCAG AA 4.5:1**).

### Colores de Interfaz (Neutros Cálidos)
*   **Fondo de la App:** `#EBF3FC` (Celeste cielo muy suave; enmarca la aplicación con serenidad).
*   **Fondo de Página (Hoja):** `#FFFFFF` (Blanco puro para asegurar contraste).
*   **Texto Principal:** `#3D2C29` (Marrón café oscuro; mucho más orgánico y suave para la lectura que el negro puro).
*   **Texto Muted/Secundario:** `#8B7355` (Tierra suave; para subtítulos y guías).
*   **Bordes de Tarjetas:** `#FFEDD5` (Crema cálido; define los límites de forma sutil).

### Colores de Grados (Pasteles Amigables)
Cada grado se distingue por un color pastel suave de fondo, delimitado por un borde fino y texto en una versión oscura y legible de la misma gama:

| Grado / Nivel | Fondo Pastel | Borde Fino | Texto de Contraste |
| :--- | :--- | :--- | :--- |
| **1 año** (Cuna) | `#FCE7F3` (Rosa) | `#F9A8D4` | `#BE185D` |
| **2 años** (Cuna) | `#D1FAE5` (Menta) | `#6EE7B7` | `#065F46` |
| **3 años** (Jardín) | `#FEF3C7` (Amarillo) | `#FCD34D` | `#92400E` |
| **4 años** (Jardín) | `#EDE9FE` (Lila) | `#C4B5FD` | `#5B21B6` |
| **5 años** (Jardín) | `#FFEDD5` (Durazno) | `#FDBA74` | `#9A3412` |

### Acentos de Acción
*   **Botón Principal (CTA):** `#E07A5F` (Coral cálido; invita a la acción de forma amigable).
*   **Éxito/Completado:** `#A78BFA` (Lila vibrante).

---

## 3. Tipografía

*   **Tipografía Única:** **Nunito** (Google Fonts).
    *   Sus formas redondeadas aportan el carácter infantil y cercano.
    *   La jerarquía debe ser clara: títulos grandes y legibles, con suficiente espacio entre líneas (`leading-relaxed`).

---

## 4. Sombras y Bordes en su "Punto Medio"

En lugar de sombras tridimensionales pesadas (claymorphism) o bordes de 4px, definimos estilos sutiles:

1.  **Sombras de Elevación Moderadas:**
    Usamos una única sombra muy suave con dispersión amplia y opacidad baja (5% a 8%) para separar capas, usando tonalidades marrones para mantener la calidez:
    ```css
    box-shadow: 0 6px 16px -4px rgba(61, 44, 41, 0.08);
    ```
2.  **Bordes Finos y Definidos:**
    Bordes de máximo `1.5px` o `2px` en color crema o el tono pastel del grado correspondiente. Esto evita que la interfaz se vea tosca.

---

## 5. Micro-interacciones Fluidas

Las transiciones deben sentirse suaves y orgánicas, no bruscas.
*   **Hover Limpio:** Una elevación vertical muy leve (`y: -1.5px`) y escala mínima (`scale: 1.015`) para dar feedback de selección.
*   **Tap Físico:** Reducción mínima a `scale: 0.98`.
*   **Curva de Transición:** Suave desvanecimiento (`ease-out` de `200ms`) para transiciones de color y sombras.

---

## 6. Lista de Chequeo de Diseño (UX/UI Checklist)

1.  **[ ] Sombras Ligeras:** Verificar que ninguna sombra sea demasiado oscura u opaca. Deben verse como un velo suave.
2.  **[ ] Contraste (4.5:1):** Confirmar que el texto en las etiquetas de grado se lee sin esfuerzo sobre su fondo pastel.
3.  **[ ] Sin Emojis en Acciones:** Los emojis solo representan conceptos ilustrativos (como las aulas). Los botones e iconos interactivos deben usar SVGs (Lucide/Heroicons) simples y limpios.
4.  **[ ] Punteros Claros:** El cursor debe cambiar a `pointer` en todos los elementos interactivos.
5.  **[ ] Aire Visual:** Garantizar que los elementos respiren y no estén agrupados de forma apretada.
