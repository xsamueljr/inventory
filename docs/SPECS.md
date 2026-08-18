## Sistema de inventario fullstack
Monorepo multipaquete, en el mismo repo un paquete para front y otro para back.

Sistema de inventario que permite manejar el stock de productos de una empresa.

No maneja ventas ni precios, sólo es un recuento de stock compartido en todas las tiendas (con un apartado local también).

### Elementos
- Usuarios
- Productos
- Ubicaciones
- Admins
- Correos
- Historial

## Flujo completo
Suponiendo que un producto no existe, y demostrando todas las features:
- El usuario registra un producto que no existe anteriormente, especificando nombre y stock inicial (e.g. sofá béisbol, 5)
- El sistema verifica que el producto no exista previamente y lo crea
- El sistema NO asigna ubicación (que sería global), o le asigna la ubicación del usuario (que sería local), dependiendo de si le ha dado al botón de nuevo producto en el apartado global o local de la interfaz
- Le llega un correo al jefe avisando de la acción
- El sistema guarda en el historial del usuario la acción

- Más adelante, el usuario registra una salida, indicando cantidad y descripción
- El sistema guarda en el historial del usuario la salida
- El sistema actualiza el stock del producto
- El sistema avisa al jefe de la salida
- Si el stock se ha quedado bajo (1 o menos), el sistema avisa al jefe
- El stock puede quedarse negativo, especificado por el negocio

- Si el usuario registra una entrada (que tiene cantidad y descripción), se actualiza el stock y se avisa al jefe

Los avisos al jefe son por correo electrónico.

## Registro de usuario
El formulario de registro de usuario pide nombre, contraseña y ubicación. Dicha ubicación es un desplegable con los valores que devuelva el backend al pedirle las ubicaciones. De esta forma el backend puede recibir el ID de la ubicación seleccionada sin pedírselo al usuario explícitamente.
