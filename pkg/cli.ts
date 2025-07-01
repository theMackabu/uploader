import os from 'node:os';
import { db } from '@/database';
import { version } from '#package';
import { unlink } from 'node:fs';

const { argv } = process;

switch (argv.at(2)) {
  case 'delete':
    if (argv.at(3) == undefined) {
      console.log("invalid arguments for 'delete'");
    } else if (argv.length > 5) {
      console.log("too many arguments for 'delete'");
    } else {
      unlink(`files/${argv.at(3)}-${argv.at(4)}`, err => {
        if (err) {
          console.log(`\x1b[33m${argv.at(3)}:${argv.at(4)} may not exist\n\x1b[31m  - error: \x1b[36m${err.message}\x1b[0m`);
        } else {
          db.client.query(`DELETE FROM files WHERE id = $id AND name = $name`).get({
            $id: argv.at(3),
            $name: argv.at(4)
          });
          console.log(`\x1b[32mdeleted \x1b[33m${argv.at(3)}\x1b[37m:\x1b[33m${argv.at(4)}\x1b[0m`);
        }
      });
    }
    break;
  case 'clean':
    if (argv.at(3) == undefined) {
      console.log("invalid arguments for 'delete'");
    } else if (argv.length > 5) {
      console.log("too many arguments for 'delete'");
    } else {
      try {
        db.client.query(`DELETE FROM files WHERE id = $id AND name = $name`).get({
          $id: argv.at(3),
          $name: argv.at(4)
        });
        console.log(`\x1b[32mdeleted \x1b[33m${argv.at(3)}\x1b[37m:\x1b[33m${argv.at(4)}\x1b[0m`);
      } catch (err) {
        console.log(`\x1b[33m${argv.at(3)}:${argv.at(4)} has encountered an error\n\x1b[31m  - error: \x1b[36m${err.message}\x1b[0m`);
      }
    }
    break;
  case 'list':
    if (argv.length > 3) {
      console.log("too many arguments for 'list'");
    } else {
      console.log(JSON.stringify(db.client.query(`SELECT * FROM files`).all(), null, 4));
    }
    break;
  case 'takedowns':
    if (argv.length > 3) {
      console.log("too many arguments for 'takedowns'");
    } else {
      const query = db.client.query(`SELECT * FROM takedowns`).all();
      query.map(data => {
        return console.log(
          `\x1b[36m${data.id}\n\x1b[0m\x1b[33m  - name: ${data.name}\n  - reason: ${decodeURIComponent(data.reason.replace(/\+/g, ' '))}\n\x1b[0m`
        );
      });
    }
    break;
  case 'info':
    if (argv.at(3) == undefined) {
      console.log("invalid arguments for 'info'");
    } else if (argv.length > 4) {
      console.log("too many arguments for 'info'");
    } else {
      console.log(`\x1b[36m ${JSON.stringify(db.client.query('SELECT * FROM files WHERE id = ?').all(argv.at(3)), null, 4)}\x1b[0m`);
    }
    break;
  default:
    console.log(`bun_uploader, version ${version} (${os.platform() + os.release()})`);
}
