import os,json,subprocess,time,urllib.request,signal
from pathlib import Path
from playwright.sync_api import sync_playwright
r=Path(__file__).resolve().parents[1];s=subprocess.Popen(['npm','run','dev','--','--port','5182'],cwd=r,stdout=subprocess.DEVNULL,stderr=subprocess.STDOUT,start_new_session=True)
try:
 for _ in range(80):
  try:urllib.request.urlopen('http://127.0.0.1:5182');break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH'),args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl','--ignore-gpu-blocklist']);page=b.new_page(viewport={'width':1500,'height':950});errors=[];page.on('pageerror',lambda e:(errors.append(str(e)),print(e,flush=True)))
  page.goto('http://127.0.0.1:5182');page.wait_for_function('window.cadDiagnostics&&cadDiagnostics().webgl');page.wait_for_timeout(800)
  page.locator('[data-select="cut"]').click();assert page.locator('#metrics').inner_text().find('volume')>=0
  page.locator('[data-select="base"]').click();page.locator('[data-property="params.width"]').fill('60');page.locator('[data-property="params.width"]').press('Tab');page.locator('[data-select="cut"]').click();assert '60.00' in page.locator('#metrics').inner_text()
  page.locator('#undo').click();page.locator('[data-select="cut"]').click();assert '50.00' in page.locator('#metrics').inner_text();page.locator('#redo').click()
  page.locator('[data-add="box"]').click();assert page.evaluate('cadDiagnostics().nodes')==5;page.locator('[data-property="params.height"]').fill('-3');page.locator('[data-property="params.height"]').press('Tab');assert 'Invalid numeric' in page.locator('#console').inner_text();page.locator('#undo').click()
  page.locator('#sketch').click();canvas=page.locator('#sketch-canvas');rect=canvas.bounding_box()
  for x,y in [(240,250),(320,250),(320,170),(240,170)]:page.mouse.click(rect['x']+x*rect['width']/600,rect['y']+y*rect['height']/420)
  page.locator('#pad').click();assert page.evaluate('cadDiagnostics().nodes')==5
  page.locator('[data-select="bracket"]').click();page.locator('[data-select="part-2"]').click(modifiers=['Shift']);page.locator('[data-boolean="union"]').click();assert page.evaluate('cadDiagnostics().nodes')==6
  page.locator('#projection').click();page.locator('[data-view="top"]').click();page.locator('#wire').click();page.locator('#wire').click();page.locator('#clip').check();page.locator('#section').fill('10');page.locator('#clip').uncheck();page.locator('[data-view="iso"]').click();page.locator('#fit').click()
  for kind in ['stl','obj','png']:
   with page.expect_download() as dl:page.locator(f'[data-export="{kind}"]').click()
   data=dl.value;target=r/'docs'/f'checked-export.{kind}';data.save_as(str(target));assert target.stat().st_size>50;target.unlink()
  with page.expect_download() as dl:page.locator('#save').click()
  target=r/'docs'/'roundtrip.json';dl.value.save_as(str(target));doc=json.loads(target.read_text());assert len(doc['nodes'])==6
  page.locator('#new').click();assert page.evaluate('cadDiagnostics().nodes')==0;page.locator('#file').set_input_files(str(target));page.wait_for_function('cadDiagnostics().nodes===6');target.unlink()
  # Pointer picking through real rendered viewport. Scan a small set of positions.
  page.locator('#fit').click();viewport=page.locator('#view').bounding_box();picked=False
  for ox,oy in [(.42,.52),(.52,.52),(.6,.5),(.45,.6),(.5,.5)]:
   page.mouse.click(viewport['x']+viewport['width']*ox,viewport['y']+viewport['height']*oy)
   if page.evaluate('cadDiagnostics().selected.length')==1:picked=True;break
  assert picked,'No raycast selection found'
  page.locator('#measure').click();px=viewport['x']+viewport['width']*ox;py=viewport['y']+viewport['height']*oy;page.mouse.click(px,py);page.mouse.click(px+4,py+4);assert 'Distance' in page.locator('#measurement').inner_text();assert float(page.locator('#measurement').inner_text().split()[1])>0;page.locator('#measure').click()
  page.screenshot(path=str(r/'docs/desktop.png'));page.reload();page.wait_for_function('cadDiagnostics().nodes===6');assert not errors,errors
  page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(300);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');page.screenshot(path=str(r/'docs/mobile.png'))
  (r/'docs/browser-report.json').write_text(json.dumps({'passed':['WebGL rendering','parametric source edit recomputes Boolean','undo redo','invalid dimension rejection','interactive sketch pad','two operand union','orthographic and preset views','wireframe and section','STL OBJ PNG downloads','JSON roundtrip','raycast picking','surface distance measurement','autosave reload','mobile layout'],'page_errors':errors},indent=2));b.close()
finally:os.killpg(s.pid,signal.SIGTERM)
