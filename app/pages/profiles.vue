<script setup lang="ts">
import { toRaw } from "vue";
import type { CvContactKind, CvProfileProps } from "@core/domain/cv";

type LocalProfile = CvProfileProps & { id: string; createdAt: number; updatedAt: number };
type LocalProfileInput = CvProfileProps;

definePageMeta({ layout: false, public: true });

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
        if (index >= 0) items[index] = { ...items[index], ...structuredClone(draft.value), updatedAt: now };
    } else {
        items.push({ ...structuredClone(draft.value), id: uid("profile"), createdAt: now, updatedAt: now });
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
</script>

<template>
    <NuxtLayout name="editor" title="Profile editor" app-label="LOCAL" :formatting-enabled="false">
        <template #sidebar>
            <nav class="profiles-list" aria-label="Local profiles">
                <header class="profiles-list__header"><span>Profiles</span></header>
                <button class="profiles-new" type="button" @click="startCreate">＋ New profile</button>
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
                    <footer><button type="button" @click="editingId = null">Cancel</button><button class="profile-save" type="button" @click="save">Save profile</button></footer>
                </template>
            </section>
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
.profile-error { color: var(--danger, #f38ba8); }
.profile-form footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 24px; }
.profile-form footer .profile-save { border-color: var(--accent, #89b4fa); background: var(--accent, #89b4fa); color: #111; }
@media (max-width: 760px) { .profile-grid, .contact-row, .education-row, .experience-row, .project-row, .compact-row { grid-template-columns: 1fr; } }
</style>
