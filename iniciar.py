"""Vinlume Disk - lanzador con menu en consola.

Uso:  python iniciar.py          (menu)
      python iniciar.py --auto   (sin preguntas; nunca borra la base)
Requiere XAMPP con MySQL encendido.
"""
import importlib
import importlib.metadata as md
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
SQL = BASE / 'database' / 'vinlume.sql'
BACKUPS = BASE / 'database' / 'backups'
MAX_BACKUPS = 5
URL = 'http://127.0.0.1:8000/'
AUTO = '--auto' in sys.argv
ANCHO = 62
os.chdir(BASE)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'VinlumeDjango.settings')

# ============================ INTERFAZ ============================
if os.name == 'nt':
    os.system('')          # activa colores ANSI en CMD de Windows 10+
COLOR = bool((sys.stdout.isatty() or os.environ.get('FORCE_COLOR')) and not os.environ.get('NO_COLOR'))


def _c(codigo):
    return (lambda t: f'\033[{codigo}m{t}\033[0m') if COLOR else (lambda t: t)


rojo, verde, azul = _c('1;91'), _c('1;92'), _c('1;94')
amarillo, cian, tenue, negrita = _c('1;93'), _c('96'), _c('90'), _c('1')
ANSI = re.compile(r'\x1b\[[0-9;]*m')
RESUMEN = []               # (texto, ok) de cada paso, para el resumen final

BANNER = r"""
 __     _____ _   _ _     _   _ __  __ _____
 \ \   / /_ _| \ | | |   | | | |  \/  | ____|
  \ \ / / | ||  \| | |   | | | | |\/| |  _|
   \ V /  | || |\  | |___| |_| | |  | | |___
    \_/  |___|_| \_|_____|\___/|_|  |_|_____|
"""


def limpiar():
    if COLOR:
        os.system('cls' if os.name == 'nt' else 'clear')


def banner():
    limpiar()
    print(azul(BANNER))
    modo = 'MODO AUTOMATICO' if AUTO else 'MENU'
    print(tenue('  D I S K   -   lanzador Django + MySQL (XAMPP)   ') + amarillo(f'[{modo}]'))
    print(tenue('  ' + '=' * (ANCHO - 4)))


def visible(t):
    return len(ANSI.sub('', t))


def caja(titulo, filas, color=cian):
    borde = '+' + '-' * (ANCHO - 2) + '+'
    print(color(borde))
    if titulo:
        print(color('|') + negrita((' ' + titulo).ljust(ANCHO - 2)) + color('|'))
        print(color('+' + '-' * (ANCHO - 2) + '+'))
    for fila in filas:
        relleno = max(0, ANCHO - 2 - visible(' ' + fila))
        print(color('|') + ' ' + fila + ' ' * relleno + color('|'))
    print(color(borde))


def pedir(texto):
    try:
        return input(texto)
    except (EOFError, KeyboardInterrupt):
        print()
        return None


def menu(titulo, opciones, defecto):
    """opciones: [(clave, texto, funcion_color)]. Devuelve la clave elegida."""
    print('\n' + negrita(f'  {titulo}'))
    for clave, texto, color in opciones:
        print(f'   {color("[" + clave + "]")} {texto}')
    validas = {o[0] for o in opciones}
    while True:
        r = pedir(cian('  > '))
        if r is None:
            return defecto
        if r.strip() in validas:
            return r.strip()
        print(rojo('   Opcion no valida.'))


def barra(n, total, ancho=20):
    llenos = int(ancho * n / total)
    return '[' + '#' * llenos + '.' * (ancho - llenos) + f'] {int(100 * n / total):3d}%'


def ultimas(texto, n=6):
    lineas = [l.strip() for l in str(texto).splitlines()
              if l.strip() and 'ssl-verify-server-cert' not in l]
    return '\n'.join(lineas[-n:])


def con_spinner(texto, funcion, progreso=None):
    """Ejecuta funcion() -> (ok, detalle) mostrando spinner. Devuelve ok."""
    salida = {}

    def trabajo():
        try:
            salida['r'] = funcion()
        except Exception as error:          # noqa: BLE001
            salida['r'] = (False, str(error))

    hilo = threading.Thread(target=trabajo, daemon=True)
    hilo.start()
    prefijo = (barra(*progreso) + '  ') if progreso else ''
    i = 0
    while hilo.is_alive():
        if COLOR:
            sys.stdout.write(f'\r{tenue(prefijo)}{azul("[ " + "|/-\\"[i % 4] + " ]")} {texto}...   ')
            sys.stdout.flush()
        i += 1
        time.sleep(0.1)
    hilo.join()
    ok, detalle = salida['r']
    marca = verde('[ OK ]') if ok else rojo('[FALLO]')
    linea = f'{tenue(prefijo)}{marca} {texto}'
    print(('\r' if COLOR else '') + linea + ' ' * 12)
    if detalle:
        for l in str(detalle).splitlines():
            print(tenue('        ' + l))
    RESUMEN.append((texto, ok))
    return ok


def fallar(mensaje=None):
    if mensaje:
        print('\n' + rojo('  ' + mensaje))
    pedir(tenue('\n  Presiona Enter para cerrar...'))
    sys.exit(1)


# ============================ DEPENDENCIAS ============================
def requisitos_faltantes():
    ruta = BASE / 'requirements.txt'
    faltan = []
    if not ruta.exists():
        return faltan
    for linea in ruta.read_text(encoding='utf-8').splitlines():
        linea = linea.strip()
        if not linea or linea.startswith(('#', '-')):
            continue
        nombre = re.split(r'[<>=!~\[;@ ]', linea)[0]
        try:
            md.version(nombre)
        except md.PackageNotFoundError:
            faltan.append(nombre)
    return faltan


def tarea_dependencias():
    faltan = requisitos_faltantes()
    if not faltan:
        return True, ''
    r = subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', str(BASE / 'requirements.txt')],
                       capture_output=True, text=True, errors='replace')
    importlib.invalidate_caches()
    if r.returncode != 0:
        return False, ultimas(r.stdout + r.stderr)
    return True, 'Instalado: ' + ', '.join(faltan)


# ============================ MYSQL ============================
def buscar_bin(nombre):
    candidatos = [shutil.which(nombre), f'/opt/lampp/bin/{nombre}',
                  f'/Applications/XAMPP/xamppfiles/bin/{nombre}']
    candidatos += [rf'{d}:\xampp\mysql\bin\{nombre}.exe' for d in 'CDEFG']
    return next((c for c in candidatos if c and os.path.exists(c)), None)


def conectar(cfg, con_db=True):
    import MySQLdb
    kw = dict(user=cfg['USER'], passwd=cfg['PASSWORD'],
              host=cfg['HOST'] or 'localhost', port=int(cfg['PORT'] or 3306))
    if con_db:
        kw['db'] = cfg['NAME']
    return MySQLdb.connect(**kw)


def listar_tablas(cfg):
    conexion = conectar(cfg)
    cur = conexion.cursor()
    cur.execute('SHOW TABLES')
    tablas = [f[0] for f in cur.fetchall()]
    conexion.close()
    return tablas


def asegurar_base(cfg):
    """Crea la base y el usuario con el root de XAMPP si aun no existen."""
    import MySQLdb
    try:
        conectar(cfg).close()
        return True, ''
    except MySQLdb.OperationalError as e:
        if e.args[0] not in (1049, 1045):     # 1049 base no existe, 1045 usuario/clave
            return False, f'No se pudo conectar. Enciende MySQL en XAMPP.\n{e}'
    try:
        root = MySQLdb.connect(user='root', passwd=os.environ.get('DB_ROOT_PASSWORD', ''),
                               host=cfg['HOST'] or 'localhost', port=int(cfg['PORT'] or 3306))
    except MySQLdb.OperationalError as e:
        return False, f'No pude entrar como root (clave? use DB_ROOT_PASSWORD).\n{e}'
    cur = root.cursor()
    cur.execute(f"CREATE DATABASE IF NOT EXISTS `{cfg['NAME']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci")
    cur.execute("CREATE USER IF NOT EXISTS %s@'localhost' IDENTIFIED BY %s", (cfg['USER'], cfg['PASSWORD']))
    cur.execute("ALTER USER %s@'localhost' IDENTIFIED BY %s", (cfg['USER'], cfg['PASSWORD']))
    cur.execute(f"GRANT ALL PRIVILEGES ON `{cfg['NAME']}`.* TO %s@'localhost'", (cfg['USER'],))
    cur.execute('FLUSH PRIVILEGES')
    root.close()
    return True, f"Base '{cfg['NAME']}' creada"


def exportar(cfg, destino):
    dump = buscar_bin('mysqldump')
    if not dump:
        return False, 'No encontre mysqldump (agrega xampp\\mysql\\bin al PATH).'
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_suffix('.tmp')
    r = subprocess.run(
        [dump, '-u', cfg['USER'], '-h', cfg['HOST'] or 'localhost', '-P', str(cfg['PORT'] or 3306),
         '--default-character-set=utf8mb4', '--add-drop-table', f'--result-file={temporal}', cfg['NAME']],
        env={**os.environ, 'MYSQL_PWD': str(cfg['PASSWORD'])}, capture_output=True, text=True, errors='replace')
    if r.returncode != 0 or not temporal.exists() or temporal.stat().st_size == 0:
        return False, ultimas(r.stderr)
    temporal.replace(destino)
    return True, ''


def guardar_respaldo(cfg):
    return exportar(cfg, SQL)


def respaldo_previo(cfg):
    destino = BACKUPS / f'vinlume_{datetime.now():%Y%m%d_%H%M%S}.sql'
    ok, detalle = exportar(cfg, destino)
    if ok:
        for viejo in sorted(BACKUPS.glob('vinlume_*.sql'))[:-MAX_BACKUPS]:
            viejo.unlink()
        return True, destino.name
    return False, detalle


def restaurar_sql(cfg):
    mysql = buscar_bin('mysql')
    if not mysql:
        return False, 'No encontre el cliente mysql (agrega xampp\\mysql\\bin al PATH).'
    conexion = conectar(cfg)
    cur = conexion.cursor()
    cur.execute('SET FOREIGN_KEY_CHECKS=0')
    cur.execute('SHOW TABLES')
    for (tabla,) in cur.fetchall():
        cur.execute(f'DROP TABLE IF EXISTS `{tabla}`')
    cur.execute('SET FOREIGN_KEY_CHECKS=1')
    conexion.close()
    with open(SQL, 'rb') as archivo:
        r = subprocess.run(
            [mysql, '-u', cfg['USER'], '-h', cfg['HOST'] or 'localhost', '-P', str(cfg['PORT'] or 3306),
             '--default-character-set=utf8mb4', cfg['NAME']],
            stdin=archivo, env={**os.environ, 'MYSQL_PWD': str(cfg['PASSWORD'])},
            capture_output=True, text=True, errors='replace')
    return r.returncode == 0, ultimas(r.stderr) if r.returncode else ''


def borrar_base(cfg):
    conexion = conectar(cfg, con_db=False)
    conexion.cursor().execute(f"DROP DATABASE `{cfg['NAME']}`")
    conexion.close()
    return True, ''


def manage(*args):
    r = subprocess.run([sys.executable, 'manage.py', *args], capture_output=True, text=True, errors='replace')
    return r.returncode == 0, ultimas(r.stdout + r.stderr) if r.returncode else ''


# ============================ PANTALLAS ============================
def confirmar_borrado(motivo):
    caja('ATENCION - ACCION DESTRUCTIVA', [rojo(motivo), rojo('Se borraran las tablas actuales de MySQL.')], rojo)
    r = pedir(rojo('  Escribe BORRAR para confirmar: '))
    return r is not None and r.strip() == 'BORRAR'


def panel_estado(cfg, es_mysql):
    filas = [f'Modo ........ {amarillo("AUTOMATICO") if AUTO else azul("MANUAL")}']
    if es_mysql:
        try:
            tablas = listar_tablas(cfg)
            filas.append(f"Base ........ {verde('conectada')} ({cfg['NAME']}, {len(tablas)} tablas)")
        except Exception:                    # noqa: BLE001
            filas.append(f'Base ........ {rojo("sin conexion")}')
    else:
        filas.append('Base ........ SQLite (sin MySQL)')
    if SQL.exists():
        fecha = datetime.fromtimestamp(SQL.stat().st_mtime)
        filas.append(f'Respaldo ..... vinlume.sql del {fecha:%d-%m-%Y %H:%M}')
    else:
        filas.append('Respaldo ..... aun no existe vinlume.sql')
    filas.append(f'Copias ....... {len(list(BACKUPS.glob("vinlume_*.sql")))} en database/backups')
    caja('ESTADO', filas, cian)


def resumen():
    if not RESUMEN:
        return
    filas = [(verde('[OK]') if ok else rojo('[X] ')) + ' ' + texto for texto, ok in RESUMEN]
    print()
    caja('RESUMEN', filas, cian)


def cierre(cfg, es_mysql):
    print('\n' + tenue('  ' + '-' * (ANCHO - 4)))
    if not es_mysql:
        print(verde('  Servidor detenido.'))
        return
    ok = con_spinner('Guardando respaldo en vinlume.sql', lambda: guardar_respaldo(cfg))
    if not ok:
        print(amarillo('  La base NO se borra porque el respaldo fallo.'))
    elif not AUTO:
        op = menu('Que hacemos con la base de XAMPP?', [
            ('1', 'Conservarla (sigo depurando)', verde),
            ('2', 'Borrarla (ya esta respaldada, me voy)', rojo)], defecto='1')
        if op == '2':
            con_spinner('Eliminando base de XAMPP', lambda: borrar_base(cfg))
        else:
            print(verde('  La base se conserva en XAMPP.'))


def iniciar_servidor(cfg, es_mysql):
    total = 4
    if es_mysql:
        if not con_spinner('Preparando base de datos', lambda: asegurar_base(cfg), (1, total)):
            fallar()
        try:
            tablas = listar_tablas(cfg)
        except Exception as error:           # noqa: BLE001
            fallar(f'No se pudo leer la base: {error}')
        con_spinner('Leyendo estado de la base', lambda: (True, ''), (2, total))
    else:
        tablas = []
        con_spinner('Usando SQLite (sin MySQL)', lambda: (True, ''), (1, total))
        con_spinner('Leyendo estado de la base', lambda: (True, ''), (2, total))

    restaurar = False
    if es_mysql and SQL.exists():
        if not tablas:
            restaurar = True
        elif not AUTO:
            fecha = datetime.fromtimestamp(SQL.stat().st_mtime)
            print()
            caja('LA BASE YA TIENE DATOS', [f'vinlume.sql es del {fecha:%d-%m-%Y %H:%M}',
                                            f'La base actual tiene {len(tablas)} tablas'], amarillo)
            op = menu('Que datos usar?', [
                ('1', 'Conservar la base actual', verde),
                ('2', 'Restaurar desde vinlume.sql (BORRA lo actual)', rojo)], defecto='1')
            restaurar = op == '2' and confirmar_borrado('Restaurar desde vinlume.sql.')
            if op == '2' and not restaurar:
                print(amarillo('  Confirmacion incorrecta: se conserva la base actual.'))

    if restaurar:
        def tarea():
            if tablas:
                ok, det = respaldo_previo(cfg)
                if not ok:
                    return False, det
            return restaurar_sql(cfg)
        if not con_spinner('Restaurando desde vinlume.sql', tarea, (3, total)):
            fallar()
    else:
        con_spinner('Usando base actual' if tablas else 'Sin datos previos', lambda: (True, ''), (3, total))

    def migrar():
        ok, det = manage('migrate')
        if ok and (not es_mysql or (not tablas and not restaurar)):
            ok, det = manage('cargar_catalogo')
        return ok, det
    if not con_spinner('Aplicando migraciones y datos', migrar, (4, total)):
        fallar()

    print()
    panel_estado(cfg, es_mysql)
    print()
    caja('SERVIDOR ACTIVO', [f'{azul(URL)}', tenue('Ctrl+C para detener'), tenue('(no cierres con la X para que se guarde el respaldo)')], azul)
    print()
    threading.Timer(2.5, lambda: webbrowser.open(URL)).start()
    try:
        subprocess.run([sys.executable, 'manage.py', 'runserver'])
    except KeyboardInterrupt:
        pass
    cierre(cfg, es_mysql)


def restaurar_manual(cfg, es_mysql):
    print()
    if not es_mysql or not SQL.exists():
        print(amarillo('  Necesitas MySQL configurado y database/vinlume.sql.'))
    else:
        if not con_spinner('Verificando base', lambda: asegurar_base(cfg)):
            return
        tablas = listar_tablas(cfg)
        if confirmar_borrado('Restaurar desde vinlume.sql.'):
            if tablas and not con_spinner('Copia de seguridad previa', lambda: respaldo_previo(cfg)):
                print(amarillo('  Sin copia previa no se restaura.'))
            else:
                con_spinner('Restaurando desde vinlume.sql', lambda: restaurar_sql(cfg))
        else:
            print(amarillo('  Cancelado.'))
    pedir(tenue('\n  Enter para volver al menu...'))


def guardar_manual(cfg, es_mysql):
    print()
    if not es_mysql:
        print(amarillo('  Solo disponible con MySQL.'))
    else:
        con_spinner('Guardando respaldo en vinlume.sql', lambda: guardar_respaldo(cfg))
    pedir(tenue('\n  Enter para volver al menu...'))


def main():
    banner()
    print()
    if not con_spinner('Verificando dependencias', tarea_dependencias):
        fallar('No se pudieron instalar las dependencias (revisa internet o requirements.txt).')
    from django.conf import settings
    cfg = settings.DATABASES['default']
    es_mysql = 'mysql' in cfg['ENGINE']

    if AUTO:
        iniciar_servidor(cfg, es_mysql)
    else:
        while True:
            banner()
            if not es_mysql:
                print(amarillo('\n  AVISO: DATABASES no es MySQL (revisa settings.py).'))
            op = menu('MENU PRINCIPAL', [
                ('1', 'Iniciar servidor (prepara la base y abre la pagina)', azul),
                ('2', 'Restaurar base desde vinlume.sql', rojo),
                ('3', 'Guardar respaldo ahora', verde),
                ('0', 'Salir', tenue)], defecto='0')
            if op == '1':
                iniciar_servidor(cfg, es_mysql)
                break
            elif op == '2':
                restaurar_manual(cfg, es_mysql)
            elif op == '3':
                guardar_manual(cfg, es_mysql)
            else:
                break
    resumen()
    print(tenue('\n  Hasta luego.\n'))


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('\n  Cancelado.')
