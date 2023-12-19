import { showNotice, uuidv4 } from './utils.js';

export const pushApi = 'https://push.auvasatracker.com';

let clientId = localStorage.getItem('clientId');
if (!clientId) {
    clientId = uuidv4();
    localStorage.setItem('clientId', clientId);
}
export function registerNotification(title, message) {
    fetch(pushApi + '/push-notification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            clientId: clientId, // Incluir el ID del cliente
            title: title,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));
}

export function subscribeToPushNotifications() {
    navigator.serviceWorker.ready.then(registration => {
        return registration.pushManager.getSubscription().then(existingSubscription => {
            if (existingSubscription) {
                // Verificar si la suscripción todavía está activa en el servidor
                return fetch(pushApi + '/verify-subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        clientId: clientId, // Incluir el ID del cliente
                        subscription: existingSubscription
                    })
                }).then(response => response.json()).then(data => {
                    if (data.isActive) {
                        console.log('El usuario ya está suscrito:', existingSubscription);
                        return existingSubscription;
                    } else {
                        // La suscripción no está activa en el servidor, crear una nueva
                        return registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: 'BEJe_JXnnuzZlAp-jyKK7xFRddgP-SjV3-YvOjRi0VqWOxGKmf8Jq7hn8IKbfI06lNZOdGsWpvAHgqPsCFaBz6U'
                        }).then(newSubscription => {
                            console.log('Nueva suscripción a push:', newSubscription);
                            // Enviar la nueva suscripción y el ID del cliente al servidor intermediario
                            return fetch(pushApi + '/register-subscription', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    clientId: clientId, // Incluir el ID del cliente
                                    subscription: newSubscription
                                })
                            }).then(response => {
                                if (response && response.ok) {
                                    console.log('Nueva suscripción registrada en el servidor');
                                } else if (response) {
                                    return response.text().then(text => {
                                        console.error('Error al registrar la nueva suscripción en el servidor:', text);
                                    });
                                }
                            });
                        });
                    }
                });
            } else {
                return registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: 'BEJe_JXnnuzZlAp-jyKK7xFRddgP-SjV3-YvOjRi0VqWOxGKmf8Jq7hn8IKbfI06lNZOdGsWpvAHgqPsCFaBz6U'
                }).then(newSubscription => {
                    console.log('Nueva suscripción a push:', newSubscription);
                    // Enviar la nueva suscripción y el ID del cliente al servidor intermediario
                    return fetch(pushApi + '/register-subscription', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            clientId: clientId, // Incluir el ID del cliente
                            subscription: newSubscription
                        })
                    }).then(response => {
                        if (response && response.ok) {
                            console.log('Nueva suscripción registrada en el servidor');
                        } else if (response) {
                            return response.text().then(text => {
                                console.error('Error al registrar la nueva suscripción en el servidor:', text);
                            });
                        }
                    });
                });
            }
        });
    })
    .catch(error => {
        console.error('Error al suscribirse a push:', error);
    });
}


export function addLineNotification(bellButton, stopNumber, lineNumber) {
    const currentNotification = JSON.parse(localStorage.getItem('busNotification'));
    if (currentNotification && currentNotification.stopNumber === stopNumber && currentNotification.lineNumber === lineNumber) {
        localStorage.removeItem('busNotification');
        bellButton.style.backgroundImage = "url('img/bell-gray.png')";
    } else {
        if (Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    subscribeToPushNotifications();
                    updateNotifications(bellButton, stopNumber, lineNumber);
                }
            });
        } else if (Notification.permission === 'granted') {
            subscribeToPushNotifications();
            updateNotifications(bellButton, stopNumber, lineNumber);
        } else {
            alert('Las notificaciones están desactivadas. Por favor, habilita las notificaciones en la configuración del navegador.');
        }
    }
}

export function updateNotifications(bellButton, stopNumber, lineNumber) {
    // Si stopNumber y lineNumber son null, borramos del localstorage todo y salimos
    if (!stopNumber ||!lineNumber) {
        localStorage.removeItem('busNotifications');
        return;
    }
    
    let notifications = JSON.parse(localStorage.getItem('busNotifications')) || [];
    let index = notifications.findIndex(n => n.stopNumber === stopNumber && n.lineNumber === lineNumber);

    // Si no existe la creamos, si existe, la borramos
    if (index === -1) {
        if (bellButton) {
            notifications.push({ stopNumber, lineNumber });
            bellButton.style.backgroundImage = "url('img/bell-solid.png')";
            showNotice(lineNumber);
        }
    } else {
        notifications.splice(index, 1);
        if (bellButton) {
            bellButton.style.backgroundImage = "url('img/bell-gray.png')";
        }
    }
    localStorage.setItem('busNotifications', JSON.stringify(notifications));
}

// La función principal que lee las notificaciones guardadas y las ejecuta si toca
export function checkAndSendBusArrivalNotification(tiempoRestante, lineNumber, stopNumber, stopName) {
    if (tiempoRestante <= 3) {
        let notifications = JSON.parse(localStorage.getItem('busNotifications')) || [];
        let notificationExists = notifications.some(n => n.stopNumber === stopNumber && n.lineNumber === lineNumber);

        if (notificationExists) {
            // Comprobamos que el cliente esté registrado en el servidor push
            subscribeToPushNotifications();
            registerNotification(`Notificación de llegada`, `La línea ${lineNumber} llegará en ${tiempoRestante} minutos a ${stopName}`);
        }

        // Borramos la notificación
        updateNotifications(null, stopNumber, lineNumber);
    }
}