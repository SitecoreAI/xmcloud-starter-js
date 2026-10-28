#!/usr/bin/env python3
"""Read-only Sitecore MCP diagnostic via the installed supported Codex app-server.
Uses existing managed OAuth through Codex; never reads or copies credentials.
"""
import argparse,json,os,re,select,shutil,subprocess,time
from pathlib import Path
CLI=shutil.which('codex') or '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex'
ALLOWED={'list_sites','get_all_pages_by_site','get_site_information','get_page','get_content_item_by_id','get_content_item_by_path','get_content_references','get_components_on_page','get_component','list_components','list_avail_insertopts','get_page_template_by_id','get_all_languages','search_site','search_assets','get_asset_information','get_page_path_by_live_url','get_site_id_from_item','get_allowed_comps_by_ph','search_component_ds'}
SENSITIVE=re.compile(r'(secret|password|access.?token|refresh.?token|authorization|credential)',re.I)
def redacted(obj):
 if isinstance(obj,dict):return {k:('[REDACTED]' if SENSITIVE.search(k) else redacted(v)) for k,v in obj.items()}
 if isinstance(obj,list):return [redacted(x) for x in obj]
 return obj
class RPC:
 def __init__(self):
  self.p=subprocess.Popen([CLI,'app-server','--stdio'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
  self.buf=b'';self.messages=[];self.seq=0
 def send(self,obj):self.p.stdin.write((json.dumps(obj)+'\n').encode());self.p.stdin.flush()
 def request(self,method,params,timeout=55):
  self.seq+=1;rid=self.seq;self.send({'id':rid,'method':method,'params':params});end=time.monotonic()+timeout
  while time.monotonic()<end:
   while self.messages:
    m=self.messages.pop(0)
    if m.get('id')==rid:
     if 'error' in m:raise RuntimeError(json.dumps({'method':method,'error':redacted(m['error'])}))
     return m.get('result',{})
    if 'id' in m and 'method' in m:
     self.send({'id':m['id'],'error':{'code':-32601,'message':'Read-only diagnostic does not approve interactive requests'}})
   if not select.select([self.p.stdout],[],[],1)[0]:
    if self.p.poll() is not None:raise RuntimeError('app-server exited')
    continue
   block=os.read(self.p.stdout.fileno(),65536)
   if not block:raise RuntimeError('app-server stdout closed')
   self.buf+=block
   while b'\n' in self.buf:
    line,self.buf=self.buf.split(b'\n',1)
    try:self.messages.append(json.loads(line))
    except ValueError:pass
  raise TimeoutError(method+' timed out')
 def close(self):
  self.p.terminate()
  try:self.p.wait(timeout=3)
  except subprocess.TimeoutExpired:self.p.kill();self.p.wait()
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--tool',choices=sorted(ALLOWED));parser.add_argument('--arguments',default='{}');parser.add_argument('--output',required=True);parser.add_argument('--catalog-output')
 a=parser.parse_args();out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
 rpc=RPC()
 try:
  rpc.request('initialize',{'clientInfo':{'name':'allianz_readonly_diagnostic','version':'1.0'}});rpc.send({'method':'initialized','params':{}})
  status=rpc.request('mcpServerStatus/list',{'serverName':'marketer','detail':'toolsAndAuthOnly','limit':20})
  servers=[s for s in status.get('data',[]) if s.get('name')=='marketer']
  if len(servers)!=1:raise RuntimeError('Expected exactly one marketer server')
  server=servers[0];tools=server.get('tools',{})
  catalog=redacted({'recordedUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'server':'marketer','authStatus':server.get('authStatus'),'runtimeStatus':server.get('runtimeStatus'),'toolsError':server.get('toolsError'),'tools':tools})
  if a.catalog_output:Path(a.catalog_output).write_text(json.dumps(catalog,indent=2)+'\n')
  if not a.tool:result=catalog
  else:
   if a.tool not in tools:raise RuntimeError('Requested read tool absent from current catalog')
   annotations=tools[a.tool].get('annotations',{})
   if annotations.get('readOnlyHint') is not True or annotations.get('destructiveHint') is True:raise RuntimeError('Requested tool is not explicitly read-only')
   thread=rpc.request('thread/start',{'cwd':str(Path.cwd()),'ephemeral':True,'sandbox':'read-only'})
   tid=thread['thread']['id']
   result=rpc.request('mcpServer/tool/call',{'threadId':tid,'server':'marketer','tool':a.tool,'arguments':json.loads(a.arguments)},timeout=60)
   result={'recordedUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'tool':a.tool,'arguments':json.loads(a.arguments),'result':redacted(result)}
  out.write_text(json.dumps(result,indent=2)+'\n')
  print(json.dumps({'saved':str(out),'authStatus':catalog['authStatus'],'toolCount':len(tools),'tool':a.tool,'resultKeys':list(result)}))
 finally:rpc.close()
if __name__=='__main__':main()
