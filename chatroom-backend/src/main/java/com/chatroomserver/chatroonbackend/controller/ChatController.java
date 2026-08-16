package com.chatroomserver.chatroonbackend.controller;

import com.chatroomserver.chatroonbackend.model.Message;
import lombok.AllArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RestController;

@RestController
@AllArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate simpMessagingTemplate;

    @MessageMapping("/message")
    @SendTo("/chatroom/public")
    public Message receiveMessage(Message message) {

        System.out.println("Received message: " + message);

        return message;
    }

   @MessageMapping("/private-message")
public Message privateMessage(Message message){
    simpMessagingTemplate.convertAndSendToUser(
        message.getReceiverName(),
        "/private",
        message
    );
    return message;
}
}