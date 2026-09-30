"""Arranque con un clic: importa database/vinlume.sql en MySQL (XAMPP),
aplica migraciones y levanta el servidor.  Uso: python iniciar.py  (o doble clic en iniciar.bat)
"""
import os
import shutil
import subprocess
import sys
import threading
import webbrowser
from datetime import datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent
SQL = BASE / 'database' / 'vinlume.sql'
BACKUPS = BASE / 'database' / 'backups'
MAX_BACKUPS = 5
os.chdir(BASE)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'VinlumeDjango.settings')


def buscar_mysql():
    """Busca el cliente mysql (XAMPP o PATH)."""
    for ruta in (shutil.which('mysql'), r'C:\xampp\mysql\bin\mysql.exe',
                 '/opt/lampp/bin/mysql', '/Applications/XAMPP/xamppfiles/bin/mysql'):
        if ruta and os.path.exists(ruta):
            return ruta
    return None


def manage(*args):
    return subprocess.run([sys.executable, 'manage.py', *args]).returncode


def salir(mensaje, codigo=1):
    print(f'\n{mensaje}')
    sys.exit(codigo)


def exportar(cfg, destino):
    """Exporta la base a 'destino' (via archivo temporal). Devuelve True si salio bien."""
    dump = shutil.which('mysqldump') or (buscar_mysql() or '').replace('mysql.exe', 'mysqldump.exe').replace('/mysql', '/mysqldump')
    if not dump or not os.path.exists(dump):
        print('No encontre mysqldump (agrega C:\\xampp\\mysql\\bin al PATH).')
        return False
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_suffix('.tmp')
    r = subprocess.run(
        [dump, '-u', cfg['USER'], '-h', cfg['HOST'] or 'localhost', '-P', str(cfg['PORT'] or 3306),
         '--default-character-set=utf8mb4', '--add-drop-table', f'--result-file={temporal}', cfg['NAME']],
        env={**os.environ, 'MYSQL_PWD': str(cfg['PASSWORD'])})
    if r.returncode != 0:
        return False
    temporal.replace(destino)
    return True


def respaldar(cfg):
    """Base -> database/vinlume.sql (al detener el servidor)."""
    if exportar(cfg, SQL):
        print(f'Respaldo guardado en {SQL}')
    else:
        print('No se pudo guardar el respaldo; el .sql anterior no se modifico.')


def respaldo_previo(cfg):
    """Copia de seguridad de la base actual antes de borrarla; conserva las ultimas MAX_BACKUPS."""
    destino = BACKUPS / f'vinlume_{datetime.now():%Y%m%d_%H%M%S}.sql'
    if not exportar(cfg, destino):
        return False
    for viejo in sorted(BACKUPS.glob('vinlume_*.sql'))[:-MAX_BACKUPS]:
        viejo.unlink()
    print(f'Copia de seguridad previa: {destino.name}')
    return True


def restaurar(cfg, connection):
    mysql = buscar_mysql()
    if not mysql:
        salir('No encontre el cliente mysql. Agrega C:\\xampp\\mysql\\bin al PATH o importa el .sql a mano en phpMyAdmin.')
    with connection.cursor() as c:
        c.execute('SET FOREIGN_KEY_CHECKS=0')
        for tabla in connection.introspection.table_names():
            c.execute(f'DROP TABLE IF EXISTS `{tabla}`')
        c.execute('SET FOREIGN_KEY_CHECKS=1')
    connection.close()
    print('Importando base de datos...')
    with open(SQL, 'rb') as archivo:
        r = subprocess.run(
            [mysql, '-u', cfg['USER'], '-h', cfg['HOST'] or 'localhost', '-P', str(cfg['PORT'] or 3306),
             '--default-character-set=utf8mb4', cfg['NAME']],
            stdin=archivo, env={**os.environ, 'MYSQL_PWD': str(cfg['PASSWORD'])})
    if r.returncode != 0:
        salir('Fallo la importacion del .sql (revisa el mensaje de arriba).')


def main():
    import django
    django.setup()
    from django.conf import settings
    from django.db import connection

    cfg = settings.DATABASES['default']
    es_mysql = 'mysql' in cfg['ENGINE']

    print('=== Vinlume Disk - Inicio ===')
    if not es_mysql:
        print('AVISO: la base configurada NO es MySQL (revisa DATABASES en settings.py).')
    print('Se preparara la base y se levantara el servidor.')
    if es_mysql:
        print('Al detenerlo con Ctrl+C se guarda un respaldo en database/vinlume.sql.')
    if input('Continuar? (s/n): ').strip().lower() not in ('s', 'si', 'y'):
        salir('Abortado. No se hizo ningun cambio.', 0)

    try:
        connection.ensure_connection()
    except Exception as error:
        salir(f'No se pudo conectar a la base de datos.\n'
              f'Enciende MySQL en el panel de XAMPP y revisa usuario/clave en settings.py.\n{error}')

    tablas = connection.introspection.table_names()
    if es_mysql and SQL.exists():
        if not tablas:
            restaurar(cfg, connection)
        else:
            fecha = datetime.fromtimestamp(SQL.stat().st_mtime)
            print(f'\nvinlume.sql es del {fecha:%d-%m-%Y %H:%M}. La base actual tiene {len(tablas)} tablas.')
            if input('[1] Conservar la base actual  [2] Restaurar desde vinlume.sql (BORRA lo actual): ').strip() == '2':
                if input("Para confirmar escribe BORRAR: ").strip() != 'BORRAR':
                    print('Confirmacion incorrecta: se conserva la base actual.')
                elif not respaldo_previo(cfg):
                    print('No se pudo hacer la copia de seguridad: se conserva la base actual.')
                else:
                    restaurar(cfg, connection)

    if manage('migrate') != 0:
        salir('Fallo migrate.')
    if not tablas and not (es_mysql and SQL.exists()):
        manage('cargar_catalogo')

    print('\nServidor en http://127.0.0.1:8000/  (Ctrl+C para detener)')
    threading.Timer(3, lambda: webbrowser.open('http://127.0.0.1:8000/')).start()
    try:
        manage('runserver')
    except KeyboardInterrupt:
        print('\nServidor detenido.')
    finally:
        if es_mysql:
            respaldar(cfg)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
