<script setup lang="ts">
import { toRaw } from "vue";
import type { CvContactKind, CvProfileProps } from "@core/domain/cv";
import { downloadBlob, safeFilename } from "~/utils/exportCvImage";
import {
    MIN_PASSPHRASE_LENGTH, PROFILE_FILE_EXTENSION, ProfileTransferError,
    decryptProfiles, encryptProfiles, envelopeToFile, envelopeToToken,
} from "~/utils/profileTransfer";

type LocalProfile = CvProfileProps & { id: string; createdAt: number; updatedAt: number };
type LocalProfileInput = CvProfileProps;

definePageMeta({ layout: false, public: true, path: "/p" });

const STORAGE_KEY = "cv-sv:local-profiles:v1";
const profiles = ref<LocalProfile[]>([]);
const editingId = ref<string | null>(null);
const error = ref("");
const emptyProfile = (): LocalProfileInput => ({
    version: 1,
    identity: { fullName: "", headline: "", summary: "", location: "" },
    contacts: [], experiences: [], skills: [], certifications: [], education: [], projects: [], languages: [],
});
const draft = ref<LocalProfileInput>(emptyProfile());
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const readProfiles = () => {
    try {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Partial<LocalProfile>[];
        profiles.value = stored.map((profile: any) => ({
            ...emptyProfile(),
            ...profile,
            version: profile.version ?? 1,
            identity: profile.identity ?? {
                fullName: profile.fullName ?? "", headline: profile.headline ?? "",
                summary: profile.summary ?? "", location: profile.location ?? "",
            },
            id: profile.id ?? uid("profile"),
            createdAt: profile.createdAt ?? Date.now(),
            updatedAt: profile.updatedAt ?? Date.now(),
            contacts: profile.contacts ?? [], experiences: profile.experiences ?? [], skills: profile.skills ?? [],
            certifications: profile.certifications ?? [], education: profile.education ?? [], projects: profile.projects ?? [],
            languages: profile.languages ?? [],
        } as LocalProfile)).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch { profiles.value = []; }
};
const persist = (items: LocalProfile[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    readProfiles();
};

onMounted(readProfiles);
const startCreate = () => { editingId.value = ""; draft.value = emptyProfile(); error.value = ""; };
const startEdit = (profile: LocalProfile) => {
    const cloned = structuredClone(toRaw(profile));
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...profileValue } = cloned;
    draft.value = profileValue;
    editingId.value = profile.id;
    error.value = "";
};
const save = () => {
    if (!draft.value.identity.fullName.trim()) { error.value = "Full name is required."; return; }
    if (draft.value.contacts.some(contact => !contact.value.trim())) { error.value = "Every contact needs a value."; return; }
    if (draft.value.education.some(item => !item.school.trim())) { error.value = "Every education entry needs an institution."; return; }
    if (draft.value.experiences.some(item => !item.title.trim() || !item.company.trim())) { error.value = "Every experience needs a title and company."; return; }
    if (draft.value.skills.some(item => !item.name.trim())) { error.value = "Every skill group needs a name."; return; }
    const now = Date.now();
    const items = [...profiles.value];
    if (editingId.value) {
        const index = items.findIndex(item => item.id === editingId.value);
        if (index >= 0) items[index] = { ...items[index], ...structuredClone(toRaw(draft.value)), updatedAt: now };
    } else {
        items.push({ ...structuredClone(toRaw(draft.value)), id: uid("profile"), createdAt: now, updatedAt: now });
    }
    persist(items);
    editingId.value = null;
    draft.value = emptyProfile();
};
const remove = (profile: LocalProfile) => {
    if (!confirm(`Delete ${profile.identity.fullName}'s profile?`)) return;
    persist(profiles.value.filter(item => item.id !== profile.id));
    if (editingId.value === profile.id) editingId.value = null;
};
const addContact = () => draft.value.contacts.push({ kind: "email", label: "", value: "" });
const addExperience = () => draft.value.experiences.push({ title: "", company: "", location: "", start: "", end: "", highlights: [] });
const addSkill = () => draft.value.skills.push({ name: "", skills: [] });
const addCertification = () => draft.value.certifications.push({ name: "" });
const addEducation = () => draft.value.education.push({ school: "", degree: "", location: "", start: "", end: "", details: "" });
const addProject = () => draft.value.projects.push({ name: "", url: "", description: "", technologies: [] });
const addLanguage = () => draft.value.languages.push("");

type TransferMode = "export" | "copy" | "import";
const transfer = reactive({
    mode: null as TransferMode | null,
    targets: [] as LocalProfile[],
    passphrase: "", confirm: "", input: "", fileName: "",
    error: "", status: "", busy: false,
});
const toProfileProps = (profile: LocalProfile): CvProfileProps => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...value } = structuredClone(toRaw(profile));
    return value;
};
const openTransfer = (mode: TransferMode, targets: LocalProfile[] = []) => {
    Object.assign(transfer, { mode, targets, passphrase: "", confirm: "", input: "", fileName: "", error: "", status: "", busy: false });
};
const closeTransfer = () => { if (!transfer.busy) transfer.mode = null; };
const transferLabel = computed(() => transfer.targets.length === 1
    ? transfer.targets[0]!.identity.fullName || "profile"
    : `${transfer.targets.length} profiles`);
// The header Export follows the editor context: the open saved profile, else every profile.
const selectedProfile = computed(() => profiles.value.find(item => item.id === editingId.value) ?? null);
const headerExport = computed(() => selectedProfile.value
    ? { label: "Export profile", title: `Download ${selectedProfile.value.identity.fullName || "this profile"} as an encrypted file` }
    : { label: "Export all", title: "Download all local profiles as an encrypted file", disabled: !profiles.value.length });
const exportFromHeader = () => openTransfer("export", selectedProfile.value ? [selectedProfile.value] : profiles.value);
const readTransferFile = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { transfer.error = "File is too large."; return; }
    transfer.input = await file.text();
    transfer.fileName = file.name;
    transfer.error = "";
};
const runTransfer = async () => {
    transfer.error = "";
    transfer.status = "";
    if (transfer.mode !== "import") {
        if (transfer.passphrase.length < MIN_PASSPHRASE_LENGTH) { transfer.error = `Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters.`; return; }
        if (transfer.passphrase !== transfer.confirm) { transfer.error = "Passphrases do not match."; return; }
    } else if (!transfer.input.trim()) { transfer.error = "Choose a file or paste an encrypted profile."; return; }
    transfer.busy = true;
    try {
        if (transfer.mode === "import") {
            const imported = await decryptProfiles(transfer.input, transfer.passphrase);
            if (!imported.length) throw new ProfileTransferError("The export contains no profiles.", "format");
            const now = Date.now();
            persist([...profiles.value, ...imported.map((profile, index) => ({ ...profile, id: uid("profile"), createdAt: now, updatedAt: now + index }))]);
            transfer.busy = false;
            transfer.mode = null;
            return;
        }
        const envelope = await encryptProfiles(transfer.targets.map(toProfileProps), transfer.passphrase);
        if (transfer.mode === "copy") {
            await navigator.clipboard.writeText(envelopeToToken(envelope));
            transfer.status = "Encrypted profile copied. Share the passphrase separately.";
        } else {
            const name = transfer.targets.length === 1 ? safeFilename(transferLabel.value) : "profiles";
            downloadBlob(new Blob([envelopeToFile(envelope)], { type: "application/json" }), `${name}${PROFILE_FILE_EXTENSION}`);
            transfer.status = "Encrypted file downloaded. Share the passphrase separately.";
        }
        transfer.passphrase = "";
        transfer.confirm = "";
    } catch (cause) {
        transfer.error = cause instanceof ProfileTransferError ? cause.message
            : transfer.mode === "copy" ? "Clipboard access was denied." : "Transfer failed.";
    } finally {
        transfer.busy = false;
    }
};
</script>

<template>
    <NuxtLayout name="editor" title="Profile editor" app-label="LOCAL" :formatting-enabled="false" :export-action="headerExport" @export="exportFromHeader">
        <template #sidebar>
            <nav class="profiles-list" aria-label="Local profiles">
                <header class="profiles-list__header"><span>Profiles</span></header>
                <button class="profiles-new" type="button" @click="startCreate">＋ New profile</button>
                <div class="profiles-transfer">
                    <button type="button" @click="openTransfer('import')">Import</button>
                    <button type="button" :disabled="!profiles.length" @click="openTransfer('export', profiles)">Export all</button>
                </div>
                <p v-if="!profiles.length" class="profiles-empty">No local profiles yet.</p>
                <button v-for="profile in profiles" :key="profile.id" class="profile-card" :class="{ active: editingId === profile.id }" type="button" @click="startEdit(profile)">
                    <span><strong>{{ profile.identity.fullName }}</strong><small>{{ profile.identity.headline || "No headline" }}</small></span>
                    <span class="profile-delete" role="button" tabindex="0" :aria-label="`Delete ${profile.identity.fullName}`" @click.stop="remove(profile)">×</span>
                </button>
            </nav>
        </template>

        <template #workspace>
            <main class="profiles-page">
            <section class="profile-form">
                <div v-if="editingId === null" class="profile-placeholder">Select a profile or create a new one.</div>
                <template v-else>
                    <div class="profile-grid">
                        <label>Full name<input v-model="draft.identity.fullName" maxlength="120"></label>
                        <label>Headline<input v-model="draft.identity.headline" placeholder="Software engineer, product designer…"></label>
                        <label>Location<input v-model="draft.identity.location" placeholder="City, Country"></label>
                    </div>
                    <label>Summary<textarea v-model="draft.identity.summary" rows="4" /></label>

                    <div class="profile-section-heading"><h2>Contact information</h2><button type="button" @click="addContact">＋ Add</button></div>
                    <div v-for="(contact, index) in draft.contacts" :key="index" class="contact-row">
                        <select v-model="contact.kind"><option v-for="kind in (['email', 'phone', 'linkedin', 'github', 'website', 'other'] as CvContactKind[])" :key="kind" :value="kind">{{ kind }}</option></select>
                        <input v-model="contact.label" aria-label="Contact label" placeholder="Label">
                        <input v-model="contact.value" aria-label="Contact value" placeholder="Value">
                        <button type="button" aria-label="Remove contact" @click="draft.contacts.splice(index, 1)">×</button>
                    </div>

                    <div class="profile-section-heading"><h2>Experience</h2><button type="button" @click="addExperience">＋ Add</button></div>
                    <div v-for="(experience, index) in draft.experiences" :key="index" class="profile-entry">
                        <div class="experience-row">
                            <input v-model="experience.title" placeholder="Job title">
                            <input v-model="experience.company" placeholder="Company">
                            <input v-model="experience.location" placeholder="Location">
                            <input v-model="experience.start" placeholder="Start date">
                            <input v-model="experience.end" placeholder="End date">
                            <button type="button" aria-label="Remove experience" @click="draft.experiences.splice(index, 1)">×</button>
                        </div>
                        <textarea :value="experience.highlights.join('\n')" rows="3" placeholder="Highlights, one per line" @input="experience.highlights = ($event.target as HTMLTextAreaElement).value.split('\n').filter(Boolean)" />
                    </div>

                    <div class="profile-section-heading"><h2>Skills</h2><button type="button" @click="addSkill">＋ Add</button></div>
                    <div v-for="(skill, index) in draft.skills" :key="index" class="compact-row">
                        <input v-model="skill.name" placeholder="Group name">
                        <input :value="skill.skills.join(', ')" placeholder="Comma-separated skills" @input="skill.skills = ($event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean)">
                        <button type="button" aria-label="Remove skill group" @click="draft.skills.splice(index, 1)">×</button>
                    </div>

                    <div class="profile-section-heading"><h2>Certifications</h2><button type="button" @click="addCertification">＋ Add</button></div>
                    <div v-for="(certification, index) in draft.certifications" :key="index" class="compact-row compact-row--single">
                        <input v-model="certification.name" placeholder="Certification">
                        <button type="button" aria-label="Remove certification" @click="draft.certifications.splice(index, 1)">×</button>
                    </div>

                    <div class="profile-section-heading"><h2>Education</h2><button type="button" @click="addEducation">＋ Add</button></div>
                    <div v-for="(education, index) in draft.education" :key="index" class="education-row">
                        <input v-model="education.school" placeholder="School">
                        <input v-model="education.degree" placeholder="Degree and field of study">
                        <input v-model="education.location" placeholder="Location">
                        <input v-model="education.start" placeholder="Start date">
                        <input v-model="education.end" placeholder="End date">
                        <input v-model="education.details" placeholder="Details">
                        <button type="button" aria-label="Remove education" @click="draft.education.splice(index, 1)">×</button>
                    </div>

                    <div class="profile-section-heading"><h2>Projects</h2><button type="button" @click="addProject">＋ Add</button></div>
                    <div v-for="(project, index) in draft.projects" :key="index" class="profile-entry">
                        <div class="project-row">
                            <input v-model="project.name" placeholder="Project name">
                            <input v-model="project.url" placeholder="URL">
                            <input :value="project.technologies.join(', ')" placeholder="Comma-separated technologies" @input="project.technologies = ($event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean)">
                            <button type="button" aria-label="Remove project" @click="draft.projects.splice(index, 1)">×</button>
                        </div>
                        <textarea v-model="project.description" rows="2" placeholder="Project description" />
                    </div>

                    <div class="profile-section-heading"><h2>Languages</h2><button type="button" @click="addLanguage">＋ Add</button></div>
                    <div v-for="(_, index) in draft.languages" :key="index" class="compact-row compact-row--single">
                        <input v-model="draft.languages[index]" placeholder="Language and proficiency">
                        <button type="button" aria-label="Remove language" @click="draft.languages.splice(index, 1)">×</button>
                    </div>
                    <p v-if="error" class="profile-error">{{ error }}</p>
                    <footer>
                        <template v-if="editingId">
                            <button type="button" title="Copy this saved profile to the clipboard, encrypted" @click="openTransfer('copy', profiles.filter(item => item.id === editingId))">Copy encrypted</button>
                            <button type="button" title="Download this saved profile as an encrypted file" @click="openTransfer('export', profiles.filter(item => item.id === editingId))">Export</button>
                            <span class="profile-footer-spacer" />
                        </template>
                        <button type="button" @click="editingId = null">Cancel</button><button class="profile-save" type="button" @click="save">Save profile</button></footer>
                </template>
            </section>
            <div v-if="transfer.mode" class="transfer-backdrop" @click.self="closeTransfer" @keydown.esc="closeTransfer">
                <form class="transfer-dialog" role="dialog" aria-modal="true" aria-labelledby="transfer-title" @submit.prevent="runTransfer">
                    <h2 id="transfer-title">
                        {{ transfer.mode === "import" ? "Import encrypted profiles" : transfer.mode === "copy" ? `Copy ${transferLabel} encrypted` : `Export ${transferLabel} encrypted` }}
                    </h2>
                    <template v-if="transfer.mode === 'import'">
                        <label>Encrypted file<input type="file" :accept="`${PROFILE_FILE_EXTENSION},application/json,text/plain`" @change="readTransferFile"></label>
                        <label>…or paste from clipboard<textarea v-model="transfer.input" rows="4" placeholder="cvsv-profile:…" spellcheck="false" @input="transfer.fileName = ''" /></label>
                        <label>Passphrase<input v-model="transfer.passphrase" type="password" autocomplete="off" autofocus></label>
                    </template>
                    <template v-else>
                        <p class="transfer-hint">Profiles are encrypted in your browser with AES-256-GCM. Anyone with the passphrase can read them; it cannot be recovered.</p>
                        <label>Passphrase<input v-model="transfer.passphrase" type="password" autocomplete="new-password" :minlength="MIN_PASSPHRASE_LENGTH" autofocus></label>
                        <label>Confirm passphrase<input v-model="transfer.confirm" type="password" autocomplete="new-password"></label>
                    </template>
                    <p v-if="transfer.error" class="profile-error" role="alert">{{ transfer.error }}</p>
                    <p v-if="transfer.status" class="transfer-status" role="status">{{ transfer.status }}</p>
                    <footer>
                        <button type="button" :disabled="transfer.busy" @click="closeTransfer">{{ transfer.status ? "Done" : "Cancel" }}</button>
                        <button class="profile-save" type="submit" :disabled="transfer.busy">
                            {{ transfer.busy ? "Working…" : transfer.mode === "import" ? "Decrypt & import" : transfer.mode === "copy" ? "Encrypt & copy" : "Encrypt & download" }}
                        </button>
                    </footer>
                </form>
            </div>
            </main>
        </template>
    </NuxtLayout>
</template>

<style scoped>
.profiles-page { grid-column: 1 / -1; min-width: 0; min-height: 0; height: 100%; overflow: hidden; background: var(--bg-base, #111); color: var(--fg-text, #ddd); font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; }
.profiles-list { height: 100%; padding: 14px 12px; overflow: auto; background: var(--bg-mantle, #171717); }
.profiles-list__header { margin: 0 4px 12px; color: var(--fg-subtext0, #888); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
.profiles-new, .profile-card { width: 100%; border: 1px solid var(--border, #333); border-radius: 4px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.profiles-new { padding: 9px; margin-bottom: 12px; }
.profiles-new:hover, .profile-card:hover, .profile-card.active { border-color: var(--accent, #89b4fa); background: var(--bg-surface0, #242424); }
.profiles-empty { color: var(--fg-subtext0, #888); font-size: 11px; }
.profile-card { display: flex; justify-content: space-between; gap: 8px; padding: 10px; margin-bottom: 7px; }
.profile-card span:first-child { display: grid; min-width: 0; gap: 4px; }
.profile-card strong, .profile-card small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-card small { color: var(--fg-subtext0, #888); font-size: 10px; }
.profile-delete { padding: 0 3px; color: var(--fg-subtext0, #888); }
.profile-form { box-sizing: border-box; width: 100%; max-width: 960px; height: 100%; min-height: 0; padding: 28px; overflow: auto; }
.profile-placeholder { display: grid; min-height: 60vh; place-items: center; color: var(--fg-subtext0, #888); }
.profile-form label { display: grid; gap: 6px; margin-bottom: 14px; color: var(--fg-subtext1, #aaa); font-size: 11px; }
.profile-form input, .profile-form textarea, .profile-form select { min-width: 0; padding: 9px; border: 1px solid var(--border, #333); border-radius: 3px; outline: none; background: var(--bg-mantle, #171717); color: var(--fg-text, #ddd); font: inherit; }
.profile-form input:focus, .profile-form textarea:focus, .profile-form select:focus { border-color: var(--accent, #89b4fa); }
.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.profile-section-heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 0 10px; border-bottom: 1px solid var(--border, #333); }
.profile-section-heading h2 { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: .08em; }
.profile-section-heading button, .contact-row button, .education-row button, .profile-form footer button { border: 1px solid var(--border, #333); border-radius: 3px; padding: 6px 9px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.contact-row { display: grid; grid-template-columns: 110px 1fr 2fr auto; gap: 8px; margin-bottom: 8px; }
.profile-entry { margin-bottom: 10px; }
.profile-entry textarea { width: 100%; margin-top: 8px; resize: vertical; }
.experience-row { display: grid; grid-template-columns: 1.3fr 1.3fr 1fr .8fr .8fr auto; gap: 8px; }
.compact-row { display: grid; grid-template-columns: minmax(140px, .7fr) minmax(0, 2fr) auto; gap: 8px; margin-bottom: 8px; }
.compact-row--single { grid-template-columns: minmax(0, 1fr) auto; }
.education-row { display: grid; grid-template-columns: 1.5fr 1.5fr 1fr .8fr .8fr 1.5fr auto; gap: 8px; margin-bottom: 8px; }
.project-row { display: grid; grid-template-columns: 1fr 1.3fr 1.5fr auto; gap: 8px; }
.profiles-transfer { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: -4px 0 12px; }
.profiles-transfer button, .transfer-dialog footer button { border: 1px solid var(--border, #333); border-radius: 3px; padding: 6px 9px; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.profiles-transfer button:disabled, .transfer-dialog button:disabled { opacity: .5; cursor: default; }
.profile-footer-spacer { flex: 1; }
.transfer-backdrop { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: rgb(0 0 0 / .55); }
.transfer-dialog { box-sizing: border-box; width: min(460px, 100%); padding: 20px; border: 1px solid var(--border, #333); border-radius: 6px; background: var(--bg-base, #111); }
.transfer-dialog h2 { margin: 0 0 14px; font-size: 13px; font-weight: 500; }
.transfer-dialog label { display: grid; gap: 6px; margin-bottom: 12px; color: var(--fg-subtext1, #aaa); font-size: 11px; }
.transfer-dialog input, .transfer-dialog textarea { min-width: 0; padding: 8px; border: 1px solid var(--border, #333); border-radius: 3px; background: var(--bg-mantle, #171717); color: var(--fg-text, #ddd); font: inherit; resize: vertical; }
.transfer-hint { margin: 0 0 12px; color: var(--fg-subtext0, #888); font-size: 11px; line-height: 1.5; }
.transfer-status { color: var(--success, #a6e3a1); }
.transfer-dialog footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.transfer-dialog footer .profile-save { border-color: var(--accent, #89b4fa); background: var(--accent, #89b4fa); color: #111; }
.profile-error { color: var(--danger, #f38ba8); }
.profile-form footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.profile-form footer .profile-save { border-color: var(--accent, #89b4fa); background: var(--accent, #89b4fa); color: #111; }
@media (max-width: 760px) { .profile-grid, .contact-row, .education-row, .experience-row, .project-row, .compact-row { grid-template-columns: 1fr; } }
</style>
