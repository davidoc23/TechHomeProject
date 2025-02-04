import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { roomManagementStyles } from '../styles/roomManagementStyles';


export default function RoomManagementScreen() {
  const { rooms, error, isLoading, addRoom, removeRoom, editRoom } = useDevices();
  const [roomName, setRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const handleAddRoom = () => {
    if (roomName.trim()) {
      addRoom({ name: roomName });
      setRoomName('');
    }
  };

  const handleEditRoom = (room) => {
    if (editingRoom?.id === room.id) {
      editRoom(room.id, { name: roomName });
      setEditingRoom(null);
      setRoomName('');
    } else {
      setEditingRoom(room);
      setRoomName(room.name);
    }
  };

  return (
    <ScrollView style={roomManagementStyles.container}>
      <View style={roomManagementStyles.section}>
        <Text style={roomManagementStyles.title}>Add New Room</Text>
        
        <TextInput
          style={roomManagementStyles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Room Name"
          placeholderTextColor="#666"
        />

        <TouchableOpacity 
          style={roomManagementStyles.addButton}
          onPress={handleAddRoom}>
          <Text style={roomManagementStyles.buttonText}>
            {editingRoom ? 'Update Room' : 'Add Room'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={roomManagementStyles.section}>
        <Text style={roomManagementStyles.title}>Current Rooms</Text>
        {rooms?.map(room => (
          <View key={room.id} style={roomManagementStyles.roomItem}>
            <View style={roomManagementStyles.roomInfo}>
              {editingRoom?.id === room.id ? (
                <TextInput
                  style={roomManagementStyles.editInput}
                  value={roomName}
                  onChangeText={setRoomName}
                  autoFocus
                />
              ) : (
                <Text style={roomManagementStyles.roomName}>{room.name}</Text>
              )}
            </View>
            <View style={roomManagementStyles.roomActions}>
              <TouchableOpacity 
                style={roomManagementStyles.editButton}
                onPress={() => handleEditRoom(room)}>
                <Text style={roomManagementStyles.editButtonText}>
                  {editingRoom?.id === room.id ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={roomManagementStyles.removeButton}
                onPress={() => removeRoom(room.id)}>
                <Text style={roomManagementStyles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}