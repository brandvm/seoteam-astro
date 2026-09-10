import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function createDatabase(filename=':memory:'){
 const sql=new DatabaseSync(filename);sql.exec('PRAGMA foreign_keys=ON');
 sql.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
 for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(s=>s.endsWith('.sql')).sort()){
  if(sql.prepare('SELECT name FROM local_migrations WHERE name=?').get(name))continue;
  sql.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));sql.prepare('INSERT INTO local_migrations VALUES (?)').run(name);
 }
 const execute=(query,args)=>{const statement=sql.prepare(query);if(statement.columns().length){const results=statement.all(...args);return {results,success:true,meta:{changes:results.length}};}const result=statement.run(...args);return {results:[],success:true,meta:{changes:Number(result.changes)}};};
 function prepare(query){return {args:[],bind(...args){this.args=args;return this;},async first(){return execute(query,this.args).results[0]||null;},async all(){return execute(query,this.args);},async run(){return execute(query,this.args);},execute(){return execute(query,this.args);}};}
 return {sql,prepare,async batch(statements){sql.exec('BEGIN');try{const out=statements.map(s=>s.execute());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}},close(){sql.close();}};
}
