'use strict';

/**
 * Module dependencies
 */

const colors     = require('colors');
const vorpal     = require('vorpal')();
const serialPort = require('serialport');
const SerialPort = serialPort.SerialPort;


const DisplayType = {
    HEX   : 1,
    ASCII : 2
};

let connection    = null;
let log           = true;
let displayType   = DisplayType.ASCII;


function onData(data) {
    if (log) {
        switch (displayType) {
            case DisplayType.HEX:
                vorpal.log(data.toString('ascii').replace(/(.{2})/g, '$1 '));
                break;

            case DisplayType.ASCII:
                vorpal.log(data.toString('utf-8'));
                break;
        }
    }
}


/**
 * Commands
 */

vorpal
    .command('list', 'List serial interfaces')
    .option('-d, --details', 'Show interfaces details')
    .action(function(args, cb) {
        serialPort.list(function(err, ports) {
            for (let port of ports) {
                console.log(port.comName);

                if (!args.options.details) {
                    continue;
                }

                for (let detailName of ['manufacturer', 'serialNumber', 'pnpId', 'vendorId', 'productId']) {
                    if (port[detailName]) {
                        console.log(`  ${detailName}: ${port.manufacturer}`.gray);
                    }
                }
            }

            cb();
        });
    });

vorpal
    .command('open <interface> <baudrate> ', 'Open a serial connection with <interface> at <baudrate> speed')
    .action(function(args, cb) {
        connection = new SerialPort(args.interface, {
            baudrate: args.baudrate, parser: serialPort.parsers.raw }, false);

        connection
            .open(function(err) {
                if (err) {
                    return cb(err.toString().red);
                }

                connection.on('data', onData);

                cb();
            });
    });

vorpal
    .command('monitor <on|off>', 'Activate/desactivate data logging')
    .action(function(args, cb) {
        log = (args["on|off"] === "on");
        cb();
    });

vorpal
    .command('monitor mode <ascii|hex>', 'Set the display mode')
    .action(function(args, cb) {
        switch (args['ascii|hex']) {
            case 'ascii':
                displayType = DisplayType.ASCII;
                break;

            case 'hex':
                displayType = DisplayType.HEX;
                break;

            default:
                return cb(new TypeError('mode must either ascii or hex').toString().red);
        }

        cb();
    });

vorpal
    .command('send <ascii|hex> <data>', 'Send data in <ascii|hex> format')
    .action(function(args, cb) {
        if (connection === null || !connection.isOpen()) {
            return cb(new Error('no connection open').toString().red);
        }

        switch (args['ascii|hex']) {
            case 'ascii':
                connection.write(new Buffer(args.data, 'ascii'));
                break;

            case 'hex':
                connection.write(new Buffer(args.data, 'hex'));
                break;

            default:
                return cb(new TypeError('mode must either ascii or hex').toString().red);
        }
    });

vorpal
    .command('close', 'Close current connection')
    .action(function(args, cb) {
        if (connection === null || !connection.isOpen()) {
            return cb(new Error('no connection open').toString().red);
        }

        connection.close(function(err) {
            if (err) {
                return cb(err.toString().red);
            }

            cb();
        });
    });


/**
 * Entry point
 */

vorpal
    .delimiter('> ')
    .show()
    .parse(process.argv);