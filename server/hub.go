// Copyright 2013 The Gorilla WebSocket Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"log"
)

type RoomBytes struct {
	RoomId string
	SourceClientAddr string
	Bytes []byte
}

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	// broadcast chan []byte
	broadcast chan RoomBytes

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		broadcast:  make(chan RoomBytes),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
	}
}

func (h *Hub) run() {
	log.Println("Starting hub")
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				log.Println("Unregistering client", client.conn.RemoteAddr(), "from room", client.roomId)
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				// TODO probably inefficient method of checking, need an o(1) way to do this
				inSameRoom := client.roomId == message.RoomId
				isSameSource := client.conn.RemoteAddr().String() == message.SourceClientAddr
				if inSameRoom && !isSameSource {
					select {
					case client.send <- message.Bytes:
						log.Printf("Broadcast message sent to client (%s,%s): %s", client.roomId,  client.conn.RemoteAddr(), string(message.Bytes))
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
		}
	}
}