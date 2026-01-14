var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
// 1. Importar express-session
var session = require('express-session');

var cyberRouter = require('./routes/cyber');
var usersRouter = require('./routes/users');


var app = express(); // LA VARIABLE APP SE CREA AQUÍ

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 2. CONFIGURAR LA SESIÓN (Después de crear 'app' y antes de las rutas)
app.use(session({
    secret: 'cyberpower2203',
    resave: false,
    saveUninitialized: true
}));

// 3. MIDDLEWARE PARA EL USUARIO (Para que el Header no de error)
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuarioLogueado || null;
    res.locals.carrito = req.session.carrito || []; 
    next();
});


// 4. DEFINIR LAS RUTAS
app.use('/', cyberRouter);
app.use('/users', usersRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;