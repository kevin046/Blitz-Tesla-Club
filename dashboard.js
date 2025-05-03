async function loadEventRegistrations() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from('event_registrations')
        .select(`
            event_id,
            vehicle_model,
            registered_at,
            events:event_id (name, date, location)
        `)
        .eq('user_id', user.id)
        .is('cancelled_at', null);

    if (error) {
        console.error('Error loading registrations:', error);
        return;
    }

    const container = document.getElementById('eventRegistrations');
    container.innerHTML = data.length > 0 
        ? data.map(reg => `
            <div class="registration-item">
                <div class="registration-info">
                    <h3>${reg.events.name}</h3>
                    <div class="registration-meta">
                        <span><i class="fas fa-calendar-day"></i> ${new Date(reg.events.date).toLocaleDateString()}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${reg.events.location}</span>
                        <span><i class="fas fa-car"></i> ${reg.vehicle_model}</span>
                    </div>
                </div>
                <div class="registration-status">
                    <span class="status-badge confirmed">Confirmed</span>
                </div>
            </div>
        `).join('')
        : `<p class="no-registrations">You have no upcoming event registrations.</p>`;
}

// Call this when dashboard loads
loadEventRegistrations(); 