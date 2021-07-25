let FormData = require('form-data');
let FS = require('fs');
let Axios = require('axios');
let Cheerio = require('cheerio');
let Dlurl = require('dlurl');

let baseURL = 'https://ezgif.com';

function isURL(path) {
	let lower = path.trim().toLowerCase();
	return lower.startsWith('https://') || lower.startsWith('http://');
}

async function loadImage(type, path) {
	let data = new FormData();
	if (isURL(path))
		data.append('new-image-url', path);
	else
		data.append('new-image', FS.createReadStream(path), 'image.gif');
	let result = await Axios({
		url: `${baseURL}/${type}?url=${path}`,
		method: 'POST',
		data: data,
		headers: data.getHeaders()
	});
	return Cheerio.load(result.data);
}

async function imageToBuffer(url) {
	let img = await Axios.get(url, {responseType: 'arraybuffer'});
	return Buffer.from(img.data, 'utf-8');
}

function setupModifiers(cResultData) {
	let token = cResultData('input[name=token]').attr('value');
	let newUrl = cResultData('form').attr('action');
	let file = newUrl.substr(newUrl.lastIndexOf('/')+1);
	let data = new FormData();
	data.append('file', file);
	data.append('token', token);
	return data;
}

async function modify(newUrl, data) {
	let speed = await Axios({
		url: newUrl,
		method: 'POST',
		data: data,
		headers: data.getHeaders()
	});
	let cSpeed = Cheerio.load(speed.data);
	let output = cSpeed('div[id=output]').html();
	let cOutput = Cheerio.load(output);
	return cOutput('a[class=save]').attr('href');
}

module.exports = class EzGif {
	static async speed(path, method, delay) {
		if (method !== 'percentage' && method !== '1/100') throw 'method must be either percentage or 1/100';
		let cResultData = await loadImage('speed', path);
		let data = setupModifiers(cResultData);
		data.append('speed-method', method);
		data.append('delay', delay);
		let url = await modify(cResultData('form').attr('action'), data);
		return imageToBuffer(url);
	}

	static async reverse(path, params = {}) {
		let cResultData = await loadImage('reverse', path);
		let data = setupModifiers(cResultData);
		if (params.reverse) data.append('reverse', 'on');
		if (params.loop) data.append('loop', 'on');
		data.append('loop-count', params.loopCount ?? 0);
		if (params.backAndForth) data.append('back-and-forth', 'on');
		if (params.noRepeat) data.append('no-repeat', 'on');
		if (params.seconds) data.append('seconds', 'on');
		if (params.flip) data.append('flip', 'on');
		if (params.flop) data.append('flop', 'on');
		data.append('scsize', params.scsize ?? 32);
		data.append('scfont', params.scfont ?? 'Impact');
		data.append('scstart', params.scstart ?? 0);
		data.append('sctxt', params.sctxt ?? 1);
		data.append('scborder', params.scborder ?? 'none');
		data.append('sccolor', params.sccolor ?? 'White');
		let url = await modify(cResultData('form').attr('action'), data);
		return imageToBuffer(url);
	}
	
	static async rotate(path, params = {}) {
		let cResultData = await loadImage('reverse', path);
		let data = setupModifiers(cResultData);
		if (params.flip) data.append('flip', 'on');
		if (params.flop) data.append('flop', 'on');
		switch(params.rotateType) {
			case 'rotate_90':
			case 'rotate_270':
			case 'rotate_180':
				data.append(params.rotateType, 'on');
				break;
			case 'rotate_free':
				data.append(params.rotateType, 'on');
				data.append('free_deg', params.degrees ?? 0);
				break;
		}
		let url = await modify(cResultData('form').attr('action'), data);
		return imageToBuffer(url);
	}
}