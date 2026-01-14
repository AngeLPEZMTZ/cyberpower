var express = require('express');
var router = express.Router();
var pool = require('../config/database');

/* GET home page. */
router.get('/', async function(req, res, next) {
const result = await pool.query('SELECT * FROM cyberpower')
res.render('cyber', { listaCyber: result.rows});
});


router.get('/detalle/:id', async (req, res) => {
  // Extraemos el id de los parámetros de la URL
  const { id } = req.params; 
  try {
    // Realizamos la consulta a Neon usando el ID capturado
    const query = 'SELECT * FROM cyberpower WHERE id = $1';
    const result = await pool.query(query, [id]);
    // Renderizamos directamente pasando la primera fila del resultado
    res.render('detalle', { producto: result.rows[0] });
  } 
  finally{}
});


// Ruta para filtrar productos por marca
router.get('/filtro/:marca', async (req, res) => {
    const { marca } = req.params;
    try {
        // Consultamos solo los productos que coinciden con la marca
        // Usamos $1 para evitar inyecciones SQL y mantener la seguridad
        const query = 'SELECT * FROM cyberpower WHERE marca_producto = $1 ORDER BY id ASC';
        const result = await pool.query(query, [marca]);   
        // Renderizamos la misma vista 'cyber' pero solo con los resultados filtrados
        res.render('cyber', { listaCyber: result.rows });
    } 
    finally{}
});

// Ruta para el buscador funcional
router.get('/buscar', async (req, res) => {
    const { query } = req.query; // Captura lo que el usuario escribió
    
    try {
        // Buscamos productos que contengan el texto en su nombre o marca
        // El símbolo % sirve para buscar coincidencias parciales
        const sql = `
            SELECT * FROM cyberpower 
            WHERE nombre_producto ILIKE $1 
            OR marca_producto ILIKE $1 
            ORDER BY id ASC`;
            
        const result = await pool.query(sql, [`%${query}%`]);
        
        // Renderizamos la misma vista principal con los resultados encontrados
        res.render('cyber', { listaCyber: result.rows });
    } catch (err) {
        console.error("Error en la búsqueda:", err);
        res.status(500).send("Error al procesar la búsqueda");
    }
});

// Ruta para mostrar la página de inicio de sesión
router.get('/login-page', (req, res) => {
    res.render('login'); // Renderiza el archivo views/login.ejs
});

// Ruta para procesar el formulario (cuando el usuario presione "Entrar")
router.post('/login-proceso', async (req, res) => {
    const { user, pass } = req.body;
    try {
        const query = 'SELECT * FROM usuarios WHERE nombre_usuario = $1 AND password_usuario = $2';
        const result = await pool.query(query, [user, pass]);
        if (result.rows.length > 0) {
            const nombreCompleto = result.rows[0].nombre_completo;
            req.session.usuarioLogueado = nombreCompleto;
            // BUSCAMOS CARRITO GUARDADO EN NEON
            const carritoDB = await pool.query(
                'SELECT * FROM carrito_guardado WHERE nombre_usuario_completo = $1', 
                [nombreCompleto]
            );
            if (carritoDB.rows.length > 0) {
                // Pasamos los datos de la DB a la sesión actual
                req.session.carrito = carritoDB.rows.map(row => ({
                    id: row.id_producto,
                    nombre: row.nombre_producto,
                    precio: row.precio_producto,
                    foto: row.foto_producto
                }));
                // Opcional: Limpiar la tabla de la DB para que no se dupliquen luego
                await pool.query('DELETE FROM carrito_guardado WHERE nombre_usuario_completo = $1', [nombreCompleto]);
            }
            res.redirect('/');
        } else {
            res.render('login', { error: "Usuario o contraseña incorrectos." });
        }
    } catch (err) {
        res.status(500).send("Error en el servidor.");
    }
});

// Ruta para mostrar la página de registro

router.get('/registro', (req, res) => {
    res.render('registro'); // Renderiza el archivo views/registro.ejs
});

router.post('/registro-proceso', async (req, res) => {
    const { nombre, email, user, pass } = req.body;
    try {
        const query = 'INSERT INTO usuarios (nombre_completo, email, nombre_usuario, password_usuario) VALUES ($1, $2, $3, $4)';
        await pool.query(query, [nombre, email, user, pass]);
        // Si todo sale bien, lo mandamos al login para que entre
        res.redirect('/login-page'); 
    } catch (err) {
        console.error("Error al registrar:", err);
        res.status(500).send("El usuario o correo ya existen.");
    }
});

// Ruta para mostrar la página de edicion de perfil

// Ruta para mostrar la página de actualizacion de datos de perfil

// Ruta para ver el formulario de edición
router.get('/editarperfil', async (req, res) => {
    // 1. Verificamos sesión
    if (!req.session.usuarioLogueado) {
        return res.redirect('/login-page');
    }
    try {
        // 2. Consultamos Neon usando el nombre guardado en la sesión
        const query = 'SELECT nombre_completo, email, nombre_usuario FROM usuarios WHERE nombre_completo = $1';
        const result = await pool.query(query, [req.session.usuarioLogueado]);
        
        if (result.rows.length > 0) {
            // 3. Enviamos el objeto 'user' a la vista 'editarperfil'
            res.render('editarperfil', { user: result.rows[0] }); 
        } else {
            res.redirect('/logout');
        }
    } catch (err) {
        console.error("Error en BD:", err);
        res.status(500).send("Error al cargar los datos del perfil");
    }
});

router.post('/actualizar-perfil', async (req, res) => {
    // ... tu lógica de UPDATE de antes ...
    await pool.query(query, params);
    req.session.usuarioLogueado = nombre;
    
    // Redirigimos enviando un parámetro de éxito
    res.redirect('/editarperfil?success=true'); 
});

// Ruta para cerrar sesión de manera segura
router.get('/logout', async (req, res) => {
    try {
        const carrito = req.session.carrito || [];
        const usuario = req.session.usuarioLogueado;

        // Si hay productos y un usuario identificado, los guardamos en Neon
        if (carrito.length > 0 && usuario) {
            for (const item of carrito) {
                await pool.query(
                    'INSERT INTO carrito_guardado (nombre_usuario_completo, id_producto, nombre_producto, precio_producto, foto_producto) VALUES ($1, $2, $3, $4, $5)',
                    [usuario, item.id, item.nombre, item.precio, item.foto]
                );
            }
        }
        // Una vez guardados, destruimos la sesión normalmente
        req.session.destroy((err) => {
            if (err) return res.redirect('/inicio');
            res.clearCookie('connect.sid'); 
            res.redirect('/');
        });
    } catch (err) {
        console.error("Error al guardar carrito antes del logout:", err);
        res.redirect('/');
    }
});

// Ruta para administrar

router.get('/administrar', async (req, res) => {
    try {
        // Asegúrate de que el nombre de la tabla coincida con tu DB (ej. "productos")
        const query = 'SELECT * FROM cyberpower ';
        const result = await pool.query(query);
        
        res.render('administrar', { productos: result.rows });
    } catch (err) {
        console.error("Error al cargar administración:", err);
        res.status(500).send("Error en el servidor: " + err.message);
    }
});


router.get('/editar-producto/:id', async (req, res) => {
  // Extraemos el id de los parámetros de la URL
  const { id } = req.params; 
  try {
    // Realizamos la consulta a Neon usando el ID capturado
    const query = 'SELECT * FROM cyberpower WHERE id = $1';
    const result = await pool.query(query, [id]);
    // Renderizamos directamente pasando la primera fila del resultado
    res.render('editar_producto', { producto: result.rows[0] });
  } 
  finally{}
});

router.post('/actualizar-producto/:id', async (req, res) => {
    const id = req.params.id;
    const { nombre, precio, descripcion } = req.body; // Asegúrate de que coincidan con el 'name' del HTML
    try {
        // El orden en el array [nombre, precio, descripcion, id] 
        // debe coincidir con $1, $2, $3 y $4
        const query = `
            UPDATE cyberpower 
            SET nombre_producto = $1, 
                precio_producto = $2, 
                desc_producto = $3 
            WHERE id = $4
        `;
        
        await pool.query(query, [nombre, precio, descripcion, id]);
        res.redirect('/administrar'); 
    } catch (err) {
        console.error("Error al actualizar:", err);
        res.status(500).send("Error al actualizar los datos en Neon");
    }
});

router.post('/guardar-producto', async (req, res) => {

    const { nombre, precio, marca, foto, tipo, descripcion } = req.body;
    try {
        const query = `
            INSERT INTO cyberpower (nombre_producto, precio_producto, marca_producto, foto_producto, tipo_producto, desc_producto) 
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(query, [nombre, precio, marca, foto, tipo, descripcion]);
        res.redirect('/administrar');
    } catch (err) {
        console.error("Error al insertar en Neon:", err);
        res.status(500).send("No se pudo agregar el producto. Revisa la consola.");
    }
});

router.get('/agregar_producto', async (req, res) => {
    res.render('agregar_producto');
});

// Ruta para eliminar hardware de la tabla cyberpower
router.post('/eliminar-producto/:id', async (req, res) => {
    const id = req.params.id;

    try {
        // Ejecutamos la eliminación en Neon usando el ID
        const query = 'DELETE FROM cyberpower WHERE id = $1';
        await pool.query(query, [id]);

        // Redirigimos al panel de administración para actualizar la vista
        res.redirect('/administrar'); 
    } catch (err) {
        console.error("Error al eliminar producto:", err);
        res.status(500).send("Error al intentar eliminar el registro de la base de datos.");
    }
});

// Inicializamos el carrito 


// 1. Definimos el middleware de protección
const estaAutenticado = (req, res, next) => {
    if (req.session.usuarioLogueado) {
        return next(); // Usuario logueado, procede a la ruta
    } else {
        // Usuario no logueado, enviamos al login con el mensaje de error
        res.render('login', { error: 'Debes iniciar sesión para agregar productos al carrito.' });
    }
};

// 2. Ruta para agregar al carrito usando el middleware
router.post('/carrito/agregar/:id', estaAutenticado, async (req, res) => {
    const id = req.params.id;

    try {
        // Buscamos los detalles en la tabla 'cyberpower' de Neon
        const result = await pool.query('SELECT * FROM cyberpower WHERE id = $1', [id]);
        const producto = result.rows[0];

        if (producto) {
            // Inicializamos el carrito en la sesión si es la primera vez
            if (!req.session.carrito) {
                req.session.carrito = [];
            }

            // Guardamos los datos necesarios en el arreglo de la sesión
            req.session.carrito.push({
                id: producto.id,
                nombre: producto.nombre_producto,
                precio: producto.precio_producto, // Se guarda como VARCHAR tal cual está en DB
                foto: producto.foto_producto
            });
        }
        res.redirect('/carrito');
    } catch (err) {
        console.error("Error al agregar al carrito:", err);
        res.status(500).send("Error interno del servidor");
    }
});

// Ruta para ver la página del carrito
router.get('/carrito', (req, res) => {
    // El carrito ya está disponible en res.locals gracias a tu app.js, 
    // pero nos aseguramos de que exista en la sesión.
    const productosEnCarrito = req.session.carrito || [];
    res.render('carrito', { carrito: productosEnCarrito });
});

router.get('/carrito/eliminar/:index', (req, res) => {
    const index = req.params.index;
    
    if (req.session.carrito && req.session.carrito[index]) {
        // Eliminamos el elemento del array usando su índice
        req.session.carrito.splice(index, 1);
    }
    
    res.redirect('/carrito');
});


module.exports = router;
