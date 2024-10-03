import asyncio
from websockets.server import serve
from enum import Enum
import queue
import time
import pathlib
import ssl
import traceback

class GameState(Enum):
	GatheringPlayers = 0
	InProgress       = 1
	Completed        = 2

openGames = queue.Queue()

inProgressGames = {}

class Game:
	def __init__(self):
		self.initTime   = time.time() #seconds since epoch
		self.svrUid     = 0
		self.maxPlayers = 0
		self.clients    = []
		self.status     = GameState.GatheringPlayers
	def toStr(self):
		cliStr = str( len(self.clients) ) + ","
		for cli in self.clients:
			cliStr += str(cli[1]) + ','
		return "game %s %i %s %i" % (self.svrUid, self.maxPlayers, cliStr, int(self.status.value))
	async def updateClient( self, cliUid, hdg=-1, x=-1, y=-1, wayps=-1, nextWayPDist=-1, compTime=-1 ):
		for cli in self.clients:
			if cli[1] == cliUid:
				if hdg != -1:
					cli[2] = hdg
				if x != -1:
					cli[3] = x
				if y != -1:
					cli[4] = y
				if wayps != -1:
					cli[5] = wayps
				if nextWayPDist != -1:
					cli[6] = nextWayPDist
				if compTime != -1:
					cli[7] = compTime
				await NotifyGameClients(self, "cliUpd %i %f %f %f %i %f %f" % 
					(cliUid, hdg, x, y, wayps, nextWayPDist, compTime) )

async def NotifyGameClients( game, msgStr ):
	notifStr = "gmInf " + msgStr
	print( "notifying numClients %i %s" % (len(game.clients), msgStr) )
	idx = 0
	for client in game.clients:
		print( "client %i %i" % (idx, client[1]) ) 
		idx += 1
		try:
			print( "sending" )
			await client[0].send( notifStr )
		except Exception as e: #the client disconnected
			print("error sending status to %i excpt: %s" % (client[1],e) )
			try:
				game.clients.remove(client)
				print( "succesfully removed disconnected client %i" % client[1] )
			except Exception as e:
				print(e)
	return ( len(game.clients) > 1 )
	print( "notify game clients end" )


async def clientAppendToGame( game, cliWebSocket, cliUid ):
	cliInfo    = [0] * 7
	cliInfo[0] = cliWebSocket
	cliInfo[1] = cliUid
	print( "len cliInfo %i" % (len(cliInfo)) )
	game.clients.append( cliInfo ) #append to game players
	plrJoinedNotifStr = "joined %i %s" % ( cliUid, game.toStr() )
	return await NotifyGameClients( game, plrJoinedNotifStr )


"""add the client uid to the first avaliable open game
and notify the players
when the game is full move it to in progress games
return the game server uid for lookup
"""
async def clientJoinFirstOpenGame( clientWebsocket, clientUid ):
	statusStr = "clnt joined "
	try:
		plrsInGame = False
		while( not plrsInGame ):
			opnGame = openGames.queue[0]
			plrsInGame = await clientAppendToGame( opnGame, clientWebsocket, clientUid )
			if( len( opnGame.clients ) > opnGame.maxPlayers ):
				opnGame.status = GameState.InProgress
				openGames.get() #remove from queue
			if not plrsInGame:
				openGames.get() #players left remove game
		statusStr += "%i %s" % ( clientUid, opnGame.toStr() )
	except IndexError:
		statusStr += "-1" #no openGames (games waiting for players)
	await clientWebsocket.send( statusStr )
	print( "clientJoinFirstOpenGame end" )



async def echo(websocket):
	async for message in websocket:
		print("rcvd msg: %s" % (message))
		try:
			msgParts = message.split(" ")
			nextIsNumPlayers = False
			clientUid = 0
			nextIsUid = False
			newGameState = None
			clientFoundGameSvrUid = -1
			if msgParts[0] == "cliUpdS":
				svrUid    = int(msgParts[1])
				cliUid    = int(msgParts[2])
				game = inProgressGames.get( svrUid )
				cliBotHdg         = float(msgParts[3])
				cliBoatX          = float(msgParts[4])
				cliBoatY          = float(msgParts[5])
				cliBouysRounded   = int(msgParts[6])
				cliDistToNextBouy = float(msgParts[7])
				cliCompTime       = float(msgParts[8])
				await game.updateClient( cliUid, cliBotHdg, cliBoatX, cliBoatY,
					cliBouysRounded, cliDistToNextBouy, cliCompTime )
			elif msgParts[0] == "clientStarted":
				clientLookingForGame = True
				clientUid = int(msgParts[2])
				await clientJoinFirstOpenGame( websocket, clientUid )
			elif msgParts[0] == "serverStarted":
				newGameState = Game()
				newGameState.svrUid = int(msgParts[4])
				newGameState.maxPlayers = int(msgParts[2])
				openGames.put( newGameState )
				inProgressGames.setdefault( newGameState.svrUid, newGameState )
				plrsInGame = await clientAppendToGame( newGameState, websocket, newGameState.svrUid )
				str = ( 'svr newGameSvrId %i %s' % 
					(newGameState.svrUid, 
					newGameState.toStr()) )
				print( str )
				await websocket.send( str )
			elif msgParts[0] == "svrStartGame":
				game = inProgressGames.get( int(msgParts[1]) )
				game.status =  GameState.InProgress
				startedNotifStr = "gameStarted"
				await NotifyGameClients(game, startedNotifStr)
		except Exception as e:
			print( "error handling input %s" % e)
			print( traceback.format_exc() )
	print("echo func end")

from http import HTTPStatus


#import logging
async def main():
	print("starting server")
	ip = ""
	port = 9999

	#logging.basicConfig(
	#    format="%(message)s",
	#    level=logging.DEBUG,
	#)

	ssl_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
	localhost_pem =  pathlib.Path(__file__).with_name("mycert.pem")
	print(localhost_pem)
	ssl_context.load_cert_chain(localhost_pem)

	async with serve(echo, ip, port, ssl=ssl_context):
		print( "serving at %s port %i" % (ip, port) )
		await asyncio.get_running_loop().create_future()

asyncio.run(main())
