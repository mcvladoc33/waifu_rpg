from aiohttp import web
import socketio

# Створюємо Socket.IO сервер
sio = socketio.AsyncServer(cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

players = {}

@sio.event
async def connect(sid, environ):
    print(f"Гравець підключився: {sid}")
    players[sid] = {'x': 0, 'y': 0, 'z': 0, 'rotationY': 3.14}
    await sio.emit('currentPlayers', players, to=sid)
    await sio.emit('newPlayer', {'id': sid, 'playerInfo': players[sid]}, skip_sid=sid)

@sio.event
async def playerMovement(sid, data):
    if sid in players:
        players[sid].update(data)
        await sio.emit('playerMoved', {'id': sid, 'playerInfo': players[sid]}, skip_sid=sid)

@sio.event
async def disconnect(sid):
    print(f"Гравець відключився: {sid}")
    if sid in players:
        del players[sid]
        await sio.emit('playerDisconnected', sid)

# Роздача статичних файлів (index.html, model.vrm)
async def index(request):
    return web.FileResponse('./index.html')

app.router.add_get('/', index)
app.router.add_static('/', path='./')

if __name__ == '__main__':
    web.run_app(app, port=80)