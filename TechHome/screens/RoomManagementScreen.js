import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { useDevices } from '../hooks/useDevices';
import { useTheme } from '../context/ThemeContext';
import { roomManagementStyles } from '../styles/roomManagementStyles';
import { applyThemeToComponents } from '../theme/utils';

export default function RoomManagementScreen() {
  const { rooms, error, isLoading, addRoom, removeRoom, editRoom } = useDevices();
  const { theme, isDarkMode } = useTheme();
  
  // Get theme styles
  const themeStyles = applyThemeToComponents(theme);
  
  // Screen-specific styles
  const screenStyles = {
    roomItem: {
      ...roomManagementStyles.roomItem,
      borderColor: theme.border,
    },
    roomInfo: {
      ...roomManagementStyles.roomInfo,
    },
    editInput: {
      ...roomManagementStyles.editInput,
      backgroundColor: theme.background,
      color: theme.text,
      borderColor: theme.border,
    },
    editButton: {
      ...roomManagementStyles.editButton,
      backgroundColor: theme.primary + '20',
    },
    editButtonText: {
      color: theme.primary,
    },
    removeButton: {
      ...roomManagementStyles.removeButton,
      backgroundColor: theme.danger + '20',
    },
    removeButtonText: {
      color: theme.danger,
    }
  };
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
    <ScrollView style={themeStyles.screenContainer}>
      <StatusBar barStyle={theme.statusBar} />
      <View style={themeStyles.cardSection}>
        <Text style={[roomManagementStyles.title, themeStyles.text]}>Add New Room</Text>
        
        <TextInput
          style={themeStyles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Room Name"
          placeholderTextColor={theme.textTertiary}
        />

        <TouchableOpacity 
          style={themeStyles.primaryButton}
          onPress={handleAddRoom}>
          <Text style={themeStyles.buttonText}>
            {editingRoom ? 'Update Room' : 'Add Room'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={themeStyles.cardSection}>
        <Text style={[roomManagementStyles.title, themeStyles.text]}>Current Rooms</Text>
        {rooms?.map(room => (
          <View key={room.id} style={[themeStyles.listItem, { borderRadius: 8, marginBottom: 10 }]}>
            <View style={screenStyles.roomInfo}>
              {editingRoom?.id === room.id ? (
                <TextInput
                  style={screenStyles.editInput}
                  value={roomName}
                  onChangeText={setRoomName}
                  autoFocus
                  placeholderTextColor={theme.textTertiary}
                />
              ) : (
                <Text style={themeStyles.text}>{room.name}</Text>
              )}
            </View>
            <View style={roomManagementStyles.roomActions}>
              <TouchableOpacity 
                style={screenStyles.editButton}
                onPress={() => handleEditRoom(room)}>
                <Text style={screenStyles.editButtonText}>
                  {editingRoom?.id === room.id ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={screenStyles.removeButton}
                onPress={() => removeRoom(room.id)}>
                <Text style={screenStyles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}