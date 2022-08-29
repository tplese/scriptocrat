const express = require('express');
const debug = require('debug')('app');
const morgan = require('morgan');
const path = require('path');
const bodyParser = require('body-parser');
const scriptRouter = require('./src/routes/scriptRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, '/public/')));
app.use('/css', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/@popperjs/core/dist/umd')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/bootstrap/dist/js')));

app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'pug');

app.use('/scripts', scriptRouter());

app.get('/', (req, res) => {
	res.render('layout');
});

app.listen(port, () => {
	debug(`listening on port ${port}`);
});
