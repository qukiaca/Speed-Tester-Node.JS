#!/usr/bin/env node

const { performance } = require('node:perf_hooks');

const REQUESTS_COUNT = 10;
const TIMEOUT = 30_000;

async function download(url) {
    const start = performance.now();

    const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT),
        redirect: 'follow'
    });

    if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const ms = performance.now() - start;

    return {
        bytes: buffer.byteLength,
        ms
    };
}

async function main() {
    const input = process.argv[2];

    if (!input) {
        console.error('Выполните: node speedtest.js <url>');
        process.exitCode = 1;
        return;
    }

    let url;

    try {
        url = new URL(input);

        if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Поддерживаются только HTTP и HTTPS');
        }
    } catch (err) {
        console.error(`Некорректный URL: ${err.message}`);
        process.exitCode = 1;
        return;
    }

    console.log(`URL: ${url.href}\n\n`);

    let totalBytes = 0;
    let totalTime = 0;
    let successfulRequests = 0;

    for (let i = 1; i <= REQUESTS_COUNT; i++) {
        process.stdout.write(`Запрос ${i}/${REQUESTS_COUNT}... `);

        try {
            const { bytes, ms } = await download(url);

            totalBytes += bytes;
            totalTime += ms;
            successfulRequests++;

            const speedMbps = (bytes * 8) / (ms * 1000);

            console.log(
                `${(bytes / 1024).toFixed(1)} KB | ` +
                `${ms.toFixed(0)} ms | ` +
                `${speedMbps.toFixed(2)} Mbps`
            );
        } catch (err) {
            console.log(`Ошибка: ${err.message}`);
        }
    }

    console.log(' ');

    if (successfulRequests === 0) {
        console.log('Не удалось выполнить ни одного успешного запроса.');
        process.exitCode = 1;
        return;
    }

    const avgTime = totalTime / successfulRequests;
    const avgSpeed = (totalBytes * 8) / (totalTime * 1000);

    console.log('\nРезультаты:');
    console.log(`Успешных запросов: ${successfulRequests}/${REQUESTS_COUNT}`);
    console.log(`Общий объём:       ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Среднее время:     ${avgTime.toFixed(0)} ms`);
    console.log(`Средняя скорость:  ${avgSpeed.toFixed(2)} Mbps`);
}

main();
