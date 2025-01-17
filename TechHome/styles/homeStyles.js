import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
      },
      welcomeSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      welcomeText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1f1f1f',
      },
      statsText: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
      },
      section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
      sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
        color: '#1f1f1f',
      },
      quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
      },
      actionButton: {
        alignItems: 'center',
        padding: 12,
      },
      actionText: {
        marginTop: 8,
        color: '#007AFF',
        fontSize: 14,
      },
      activityList: {
        gap: 12,
      },
      activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      activityText: {
        fontSize: 14,
        color: '#666',
      },
      voiceButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        marginVertical: 10,
        gap: 8,
      },
      voiceButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
      },
    });