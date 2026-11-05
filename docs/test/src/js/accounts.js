(function() {
    var configKey = 'lemon_cloud_config';
    var accountConfig = readConfig();
    var supabaseClient = null;
    var syncTimer = null;
    var syncInProgress = false;
    var syncQueued = false;
    var applyingCloudData = false;
    var supabaseSdkLoading = false;
    var supabaseSdkCallbacks = [];

    function loadSupabaseSdk(callback) {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            callback();
            return;
        }
        supabaseSdkCallbacks.push(callback);
        if (supabaseSdkLoading) return;
        supabaseSdkLoading = true;
        var script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = function() {
            supabaseSdkLoading = false;
            if (!window.supabase || typeof window.supabase.createClient !== 'function') {
                setAccountStatus('The Supabase client could not initialize. Reload and try again.', true);
                supabaseSdkCallbacks = [];
                return;
            }
            supabaseSdkCallbacks.splice(0).forEach(function(onLoad) { onLoad(); });
        };
        script.onerror = function() {
            supabaseSdkLoading = false;
            setAccountStatus('The Supabase client could not load. Check your internet connection and try again.', true);
            supabaseSdkCallbacks = [];
        };
        document.head.appendChild(script);
    }

    function readConfig() {
        try {
            var value = JSON.parse(localStorage.getItem(configKey) || '{}');
            return {
                url: typeof value.url === 'string' ? value.url : '',
                key: typeof value.key === 'string' ? value.key : ''
            };
        } catch (error) {
            console.warn('Saved account connection settings could not be read:', error);
            return { url: '', key: '' };
        }
    }

    function setAccountStatus(message, isError) {
        var status = document.getElementById('accountStatus');
        status.textContent = message;
        status.setAttribute('aria-live', isError ? 'assertive' : 'polite');
        status.classList.toggle('is-error', Boolean(isError));
    }

    function showMissingSyncTableHelp() {
        var setup = document.getElementById('accountSetupDetails');
        setup.open = true;
        setAccountStatus(
            'Your sign-in worked, but cloud storage is not set up yet. Your data is still safe on this device. Open “Show database setup” below, copy it into Supabase → SQL Editor → New query, click Run, then sign in again.',
            true
        );
        setup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setup.querySelector('summary').focus({ preventScroll: true });
    }

    function isMissingSyncTableError(error) {
        var message = String(error && error.message || '').toLowerCase();
        return ['42p01', 'pgrst205', 'pgrst204'].includes(String(error && error.code || '').toLowerCase()) ||
            (message.includes('lemon_user_data') &&
                (message.includes('schema cache') || message.includes('does not exist') || message.includes('not find the table')));
    }

    async function copyAccountSetupSql() {
        var sqlInput = document.getElementById('supabaseSchemaText');
        try {
            await navigator.clipboard.writeText(sqlInput.value);
            setAccountStatus('Copied! Paste the setup into Supabase SQL Editor and click Run.');
            return;
        } catch (error) {
            console.warn('Automatic copy was unavailable; selecting database setup text instead:', error);
        }
        sqlInput.focus();
        sqlInput.select();
        try {
            if (document.execCommand('copy')) {
                setAccountStatus('Copied! Paste the setup into Supabase SQL Editor and click Run.');
                return;
            }
            throw new Error('Copy is unavailable in this browser.');
        } catch (error) {
            setAccountStatus('Select the database setup text and copy it, then paste it into Supabase SQL Editor.', true);
        }
    }

    function currentSession() {
        return supabaseClient && supabaseClient.auth.getSession().then(function(result) {
            if (result.error) throw result.error;
            return result.data.session;
        });
    }

    function updateAccountState(session) {
        var emailInput = document.getElementById('accountEmailInput');
        var signedIn = Boolean(session && session.user);
        document.getElementById('signOutAccountButton').hidden = !signedIn;
        if (signedIn) {
            emailInput.value = session.user.email || '';
            setAccountStatus('Signed in as ' + (session.user.email || 'your account') + '. Syncing your data…');
            window.setTimeout(syncAccountData, 0);
        } else if (accountConfig.url && accountConfig.key) {
            setAccountStatus('Connected to Supabase. Sign in or create an account to sync.');
        } else {
            setAccountStatus('To sync across devices, set up online storage below first. Your data stays on this device until then.');
        }
    }

    function initializeSupabase() {
        supabaseClient = null;
        if (!accountConfig.url || !accountConfig.key) {
            document.getElementById('accountSetupDetails').open = true;
            updateAccountState(null);
            return false;
        }
        document.getElementById('accountSetupDetails').open = false;
        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            setAccountStatus('Loading the Supabase client…');
            loadSupabaseSdk(initializeSupabase);
            return false;
        }
        try {
            var parsedUrl = new URL(accountConfig.url);
            if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
                throw new Error('Use an HTTPS Supabase project URL.');
            }
            supabaseClient = window.supabase.createClient(parsedUrl.origin, accountConfig.key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
            supabaseClient.auth.onAuthStateChange(function(event, session) {
                updateAccountState(session);
            });
            setAccountStatus('Connected to Supabase. Checking your account…');
            return true;
        } catch (error) {
            setAccountStatus('Supabase connection settings are invalid: ' + error.message, true);
            return false;
        }
    }

    function saveSupabaseConnection() {
        var url = document.getElementById('supabaseUrlInput').value.trim();
        var keyInput = document.getElementById('supabaseKeyInput');
        var key = keyInput.value.trim() || accountConfig.key;
        if (!url || !key) {
            setAccountStatus('Enter your Supabase project URL and publishable anon key.', true);
            return;
        }
        try {
            var parsedUrl = new URL(url);
            if ((parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') || parsedUrl.username || parsedUrl.password) {
                throw new Error('Use a valid HTTPS Supabase project URL.');
            }
            accountConfig = { url: parsedUrl.origin, key: key };
            localStorage.setItem(configKey, JSON.stringify(accountConfig));
            document.getElementById('supabaseUrlInput').value = accountConfig.url;
            keyInput.value = '';
            keyInput.placeholder = 'Saved on this device; enter a new key to replace';
            if (initializeSupabase()) {
                setAccountStatus('Supabase connection saved. Sign in or create an account to sync your data.');
            }
        } catch (error) {
            setAccountStatus(error.message, true);
        }
    }

    function getCredentials() {
        var email = document.getElementById('accountEmailInput').value.trim();
        var password = document.getElementById('accountPasswordInput').value;
        if (!supabaseClient) {
            setAccountStatus('Open “First time? Set up sync” below and save your project details first.', true);
            return null;
        }
        if (!email || !password) {
            setAccountStatus('Enter your email address and password.', true);
            return null;
        }
        if (password.length < 8) {
            setAccountStatus('Use a password with at least 8 characters.', true);
            return null;
        }
        return { email: email, password: password };
    }

    async function signInToLemonAccount() {
        var credentials = getCredentials();
        if (!credentials) return;
        setAccountStatus('Signing in…');
        try {
            var result = await supabaseClient.auth.signInWithPassword(credentials);
            if (result.error) throw result.error;
            document.getElementById('accountPasswordInput').value = '';
            updateAccountState(result.data.session);
        } catch (error) {
            setAccountStatus('Sign-in failed: ' + error.message, true);
        }
    }

    async function createLemonAccount() {
        var credentials = getCredentials();
        if (!credentials) return;
        setAccountStatus('Creating your account…');
        try {
            var result = await supabaseClient.auth.signUp(credentials);
            if (result.error) throw result.error;
            document.getElementById('accountPasswordInput').value = '';
            if (result.data.session) {
                updateAccountState(result.data.session);
            } else {
                setAccountStatus('Account created. Check your email to confirm it, then sign in.');
            }
        } catch (error) {
            setAccountStatus('Account creation failed: ' + error.message, true);
        }
    }

    async function signOutLemonAccount() {
        if (!supabaseClient) return;
        try {
            var result = await supabaseClient.auth.signOut();
            if (result.error) throw result.error;
            updateAccountState(null);
        } catch (error) {
            setAccountStatus('Could not sign out: ' + error.message, true);
        }
    }

    function getLocalAppData() {
        var data = {};
        for (var index = 0; index < localStorage.length; index += 1) {
            var key = localStorage.key(index);
            if (key && key.indexOf('lemon_') === 0 && key !== configKey) {
                data[key] = localStorage.getItem(key);
            }
        }
        return data;
    }

    function stableStringify(value) {
        if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
        if (value && typeof value === 'object') {
            return '{' + Object.keys(value).sort().map(function(key) {
                return JSON.stringify(key) + ':' + stableStringify(value[key]);
            }).join(',') + '}';
        }
        return JSON.stringify(value);
    }

    function addConflict(conflicts, key, path, localValue, cloudValue) {
        var duplicate = conflicts.some(function(conflict) {
            return conflict.key === key && conflict.path === path &&
                stableStringify(conflict.local) === stableStringify(localValue) &&
                stableStringify(conflict.cloud) === stableStringify(cloudValue);
        });
        if (duplicate) return;
        conflicts.push({
            key: key,
            path: path,
            local: localValue,
            cloud: cloudValue,
            kept: 'local',
            occurredAt: new Date().toISOString()
        });
    }

    function mergeValues(localValue, cloudValue, key, path, conflicts) {
        if (stableStringify(localValue) === stableStringify(cloudValue)) return localValue;
        if (Array.isArray(localValue) && Array.isArray(cloudValue)) {
            var merged = localValue.slice();
            cloudValue.forEach(function(cloudItem) {
                var identity = cloudItem && typeof cloudItem === 'object'
                    ? cloudItem.id !== undefined ? 'id:' + cloudItem.id
                        : cloudItem.url ? 'url:' + cloudItem.url
                            : cloudItem.key ? 'key:' + cloudItem.key
                                : cloudItem.text ? 'text:' + cloudItem.text
                                : null
                    : null;
                var localIndex = identity ? merged.findIndex(function(localItem) {
                    if (!localItem || typeof localItem !== 'object') return false;
                    var localIdentity = localItem.id !== undefined ? 'id:' + localItem.id
                        : localItem.url ? 'url:' + localItem.url
                            : localItem.key ? 'key:' + localItem.key
                                : localItem.text ? 'text:' + localItem.text
                                : null;
                    return localIdentity === identity;
                }) : -1;
                if (localIndex < 0) {
                    if (!merged.some(function(localItem) {
                        return stableStringify(localItem) === stableStringify(cloudItem);
                    })) merged.push(cloudItem);
                } else if (stableStringify(merged[localIndex]) !== stableStringify(cloudItem)) {
                    addConflict(conflicts, key, path + '[' + identity + ']', merged[localIndex], cloudItem);
                }
            });
            return merged;
        }
        if (localValue && cloudValue && typeof localValue === 'object' && typeof cloudValue === 'object' &&
            !Array.isArray(localValue) && !Array.isArray(cloudValue)) {
            var result = Object.assign({}, cloudValue);
            Object.keys(localValue).forEach(function(childKey) {
                if (Object.prototype.hasOwnProperty.call(cloudValue, childKey)) {
                    result[childKey] = mergeValues(localValue[childKey], cloudValue[childKey], key, path + '.' + childKey, conflicts);
                } else {
                    result[childKey] = localValue[childKey];
                }
            });
            return result;
        }
        addConflict(conflicts, key, path, localValue, cloudValue);
        return localValue;
    }

    function mergeAccountData(localData, cloudData) {
        var merged = Object.assign({}, cloudData);
        var conflicts = Array.isArray(cloudData.__conflicts) ? cloudData.__conflicts.slice() : [];
        var previousConflicts = localData.lemon_sync_conflicts;
        if (previousConflicts) {
            try {
                JSON.parse(previousConflicts).forEach(function(conflict) {
                    if (!conflicts.some(function(existing) { return stableStringify(existing) === stableStringify(conflict); })) {
                        conflicts.push(conflict);
                    }
                });
            } catch (error) {
                console.warn('Saved sync conflict history could not be read:', error);
            }
        }
        Object.keys(localData).forEach(function(key) {
            if (key === 'lemon_sync_conflicts') return;
            if (typeof cloudData[key] !== 'string') {
                merged[key] = localData[key];
                return;
            }
            if (localData[key] === cloudData[key]) {
                merged[key] = localData[key];
                return;
            }
            try {
                merged[key] = JSON.stringify(mergeValues(
                    JSON.parse(localData[key]),
                    JSON.parse(cloudData[key]),
                    key,
                    key,
                    conflicts
                ));
            } catch (error) {
                addConflict(conflicts, key, key, localData[key], cloudData[key]);
                merged[key] = localData[key];
            }
        });
        merged.lemon_sync_conflicts = JSON.stringify(conflicts);
        merged.__conflicts = conflicts;
        return merged;
    }

    function applyAccountData(data) {
        applyingCloudData = true;
        try {
            Object.keys(data).forEach(function(key) {
                if (key.indexOf('lemon_') === 0 && key !== configKey && typeof data[key] === 'string') {
                    localStorage.setItem(key, data[key]);
                }
            });
        } finally {
            applyingCloudData = false;
        }
    }

    function updateConflictNotice(conflicts) {
        var notice = document.getElementById('accountConflictNotice');
        notice.replaceChildren();
        notice.hidden = !conflicts.length;
        if (!conflicts.length) return;
        var message = document.createElement('p');
        message.textContent = conflicts.length + ' data conflict' + (conflicts.length === 1 ? '' : 's') +
            ' found. Your current device copy stays active; the other versions are saved in the backup data as lemon_sync_conflicts.';
        notice.appendChild(message);
    }

    async function syncAccountData() {
        if (syncInProgress) {
            syncQueued = true;
            return;
        }
        if (!supabaseClient || applyingCloudData) return;
        var session;
        try {
            session = await currentSession();
        } catch (error) {
            setAccountStatus('Could not check the account session: ' + error.message, true);
            return;
        }
        if (!session) return;
        syncInProgress = true;
        syncQueued = false;
        try {
            var query = await supabaseClient.from('lemon_user_data')
                .select('data')
                .eq('user_id', session.user.id)
                .maybeSingle();
            if (query.error) throw query.error;
            var localData = getLocalAppData();
            var cloudData = query.data && query.data.data && typeof query.data.data === 'object'
                ? query.data.data
                : {};
            var merged = mergeAccountData(localData, cloudData);
            var needsReload = Object.keys(merged).some(function(key) {
                return key !== '__conflicts' && key.indexOf('lemon_') === 0 && merged[key] !== localData[key];
            });
            applyAccountData(merged);
            var conflicts = Array.isArray(merged.__conflicts) ? merged.__conflicts : [];
            var payloadSize = new Blob([JSON.stringify(merged)]).size;
            if (payloadSize > 4 * 1024 * 1024) throw new Error('Your saved data exceeds the 4 MB cloud sync limit.');
            var saved = await supabaseClient.from('lemon_user_data').upsert({
                user_id: session.user.id,
                data: merged,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
            if (saved.error) throw saved.error;
            updateConflictNotice(conflicts);
            setAccountStatus('Signed in as ' + (session.user.email || 'your account') +
                ' · synced just now · ' + (conflicts.length ? conflicts.length + ' conflict copy/copies saved' : 'no conflicts'));
            if (needsReload) window.setTimeout(function() { window.location.reload(); }, 900);
        } catch (error) {
            if (isMissingSyncTableError(error)) {
                showMissingSyncTableHelp();
            } else {
                setAccountStatus('Cloud sync failed: ' + error.message, true);
            }
        } finally {
            syncInProgress = false;
            if (syncQueued) window.setTimeout(syncAccountData, 100);
        }
    }

    function scheduleAccountSync() {
        if (!supabaseClient || applyingCloudData) return;
        window.clearTimeout(syncTimer);
        syncTimer = window.setTimeout(syncAccountData, 900);
    }

    function exportLemonBackup() {
        var backup = {
            app: 'Lemon Station',
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            data: getLocalAppData()
        };
        var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'lemon-station-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        link.click();
        window.setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        document.getElementById('backupStatus').textContent = 'Backup exported. Keep the file somewhere safe.';
    }

    async function importLemonBackup(input) {
        var file = input.files && input.files[0];
        if (!file) return;
        try {
            if (file.size > 5 * 1024 * 1024) throw new Error('Backup files must be smaller than 5 MB.');
            var backup = JSON.parse(await file.text());
            if (!backup || backup.app !== 'Lemon Station' || backup.schemaVersion !== 1 ||
                !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
                throw new Error('This is not a supported Lemon Station backup.');
            }
            var keys = Object.keys(backup.data);
            if (keys.some(function(key) {
                return key.indexOf('lemon_') !== 0 || key === configKey || typeof backup.data[key] !== 'string';
            })) {
                throw new Error('The backup contains unsupported or invalid data.');
            }
            if (!window.confirm('Restore this backup and replace the saved Lemon Station data on this device? Your Supabase connection will be kept.')) return;
            var existingKeys = [];
            for (var index = 0; index < localStorage.length; index += 1) {
                var existingKey = localStorage.key(index);
                if (existingKey && existingKey.indexOf('lemon_') === 0 && existingKey !== configKey) existingKeys.push(existingKey);
            }
            existingKeys.forEach(function(key) { localStorage.removeItem(key); });
            Object.keys(backup.data).forEach(function(key) { localStorage.setItem(key, backup.data[key]); });
            document.getElementById('backupStatus').textContent = 'Backup restored. Reload Lemon Station to apply all restored preferences.';
            scheduleAccountSync();
        } catch (error) {
            document.getElementById('backupStatus').textContent = 'Backup restore failed: ' + error.message;
        } finally {
            input.value = '';
        }
    }

    window.saveSupabaseConnection = saveSupabaseConnection;
    window.signInToLemonAccount = signInToLemonAccount;
    window.createLemonAccount = createLemonAccount;
    window.signOutLemonAccount = signOutLemonAccount;
    window.scheduleLemonCloudSync = scheduleAccountSync;
    window.exportLemonBackup = exportLemonBackup;
    window.importLemonBackup = importLemonBackup;
    window.copyAccountSetupSql = copyAccountSetupSql;

    if (accountConfig.url) {
        document.getElementById('supabaseUrlInput').value = accountConfig.url;
        document.getElementById('supabaseKeyInput').placeholder = 'Saved on this device; enter a new key to replace';
    }
    initializeSupabase();
})();
