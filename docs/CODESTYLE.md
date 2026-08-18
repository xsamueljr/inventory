## A nivel general
- Hexagonal, aplicación dominio infraestructura:
  - Dominio: 
    - Value objects
    - Entidades
    - Repositorios (puertos / interfaces)
    - Servicios
    - Eventos
  - Aplicación: 
    - Casos de uso
    - DTOs
    - Event listeners
  - Infraestructura: 
    - Controladores
    - Implementaciones de las interfaces de dominio

No hay bounded contexts y las dependencias entre módulos no preocupan mucho; el sistema es para uso interno de la empresa y no va a necesitar escalabilidad a nivel de infraestructura. Con que tengan sentido las dependencias es suficiente, además con los eventos no se acoplarán tanto

## Módulo shared
Clase abstracta de evento, interfaz del event bus e implementación en memoria, clase abstracta ID para no tener que escribir casi en los value objects de IDs y poco más

Clase abstracta de value object, un genérico para que valga para el tipo que sea, que el método `create` sea abstracto para que si un value object no necesita ninguna validación quede explícito

Clase abstracta de error, un enum para los tipos de error (validación, no encontrado, interno...) de manera que no tenga detalles HTTP pero luego sea fácilmente mapeable (no encontrado -> 404, etc)

## Diseño de entidades y value objects
Los dos van a tener constructor privado y 2 métodos factoría: `create` y `restore`.
- Los 2 métodos reciben primitivos
- Todos (o casi todos) los campos de las entidades son value objects, se hace el mapeo de los primitivos en los métodos factoría
- `create` es para algo nuevo que se está creando la primera vez, ejecuta las validaciones, y lo que se pueda generar automáticamente se genera (e.g. no pide el ID, el value object del ID tendrá un método `generate` que lo genere)
- `restore` es para recuperar una entidad existente a partir de sus primitivos (e.g. cuando se carga de la base de datos), no ejecuta las validaciones ni genera nada automáticamente
- Las entidades tienen sus value objects privados y exponen getters que dan directamente el valor primitivo
- Los value objects tienen sus campos públicos readonly
- La lógica de negocio que se empujará a los value objects cuando tenga sentido
- Al ser privados, la entidad expondrá ese comportamiento con métodos (principio tell don't ask)
