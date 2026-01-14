const { Pool } = require ('pg');

const pool = new Pool({
user: 'UDL_user',
host: 'ep-morning-grass-a4ivz0x4-pooler.us-east-1.aws.neon.tech',
database: 'estudiantes',
password: 'npg_UMv3DdTsWNz0',
port: 5432,
ssl:{
    require: true
}
});

pool.connect((error,client, release )=>{
    if(error){
    console.error('Error de Conexion ala base de datos',error.stack);
    }
    else{
    console.log('CONEXION ESTABLECIDA CON LA BD');
    release();
    }

});




module.exports = pool;


//PGHOST='ep-morning-grass-a4ivz0x4-pooler.us-east-1.aws.neon.tech'
//PGDATABASE='estudiantes'
//PGUSER='UDL_user'
//PGPASSWORD='npg_UMv3DdTsWNz0'
//PGSSLMODE='require'
//PGCHANNELBINDING='require' 