import {spawn} from 'node:child_process';
const args=process.argv.slice(2),port=args.includes('--port')?args[args.indexOf('--port')+1]:'3000';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','0.0.0.0','--port',port],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??0));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
