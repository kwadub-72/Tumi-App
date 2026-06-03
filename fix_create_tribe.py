import re

with open('app/create-tribe.tsx', 'r') as f:
    content = f.read()

# 1. Remove EditCompetitionModal import
content = re.sub(r"import EditCompetitionModal, { CompetitionConfig } from '@/src/features/tribes/components/EditCompetitionModal';\n", "", content)

# 2. Remove FOCUS_OPTIONS
content = re.sub(r"const FOCUS_OPTIONS:[\s\S]*?\];\n", "", content)

# 3. Remove state variables
content = re.sub(r"    const \[focus, setFocus\] = useState\(FOCUS_OPTIONS\[0\]\); // Default Accountability\n\n    // Modals\n    const \[activityModalVisible, setActivityModalVisible\] = useState\(false\);\n    const \[focusModalVisible, setFocusModalVisible\] = useState\(false\);\n\n    // Competition State\n    const \[selectedCompId, setSelectedCompId\] = useState<string \| null>\(null\);\n    const \[compConfigs, setCompConfigs\] = useState<Record<string, CompetitionConfig>>\(\{\}\);\n    const \[editModalVisible, setEditModalVisible\] = useState\(false\);\n    const \[editingComp, setEditingComp\] = useState<\{ id: string, title: string, subtitle: string \} \| null>\(null\);\n", "    // Modals\n    const [activityModalVisible, setActivityModalVisible] = useState(false);\n", content)

# 4. Remove loadTribe focus/competition logic
content = re.sub(r"                        const typeVal = data\.type \?\? data\.focusType;[\s\S]*?\}\n                        \}\n", "", content)

# 5. Remove openCompEdit
content = re.sub(r"    const openCompEdit = \([\s\S]*?    };\n\n    const handleLeaveTribe", "    const handleLeaveTribe", content)

# 6. Remove saveCompConfig
content = re.sub(r"    const saveCompConfig = \([\s\S]*?    };\n\n    // Helpers", "    // Helpers", content)

# 7. Update edit mode handleSubmit
edit_submit_regex = r"                let competition: any = undefined;[\s\S]*?competition,\n                \}\);"
edit_submit_replace = """                const updated = await SupabaseTribeService.updateTribe({
                    tribeId: tribeId as string,
                    name: name.trim(),
                    avatarUrl: avatar,
                    privacy: isPrivate ? 'private' : 'public',
                    activityType: activity.name,
                    activityIcon: activity.icon as string,
                    naturalStatus: naturalStatus ?? undefined,
                });"""
content = re.sub(edit_submit_regex, edit_submit_replace, content)

# 8. Update create mode handleSubmit
create_submit_regex = r"                let competition: Parameters<typeof SupabaseTribeService\.createAndPersistTribe>\[0\]\['competition'\];[\s\S]*?competition,\n                \}\);"
create_submit_replace = """                const created = await SupabaseTribeService.createAndPersistTribe({
                    userId,
                    name: name.trim(),
                    avatarUrl: avatar,
                    tribeType: 'accountability',
                    privacy: isPrivate ? 'private' : 'public',
                    description: `A tribe for ${activity.name}.`,
                    activityType: activity.name,
                    activityIcon: activity.icon as string,
                    naturalStatus: naturalStatus ?? undefined,
                });"""
content = re.sub(create_submit_regex, create_submit_replace, content)

# 9. Remove Tribe Type and Competition Style UI
ui_regex = r"                        \{/\* Tribe Type \*/\}[\s\S]*?\{isEditMode && \("
content = re.sub(ui_regex, "{isEditMode && (", content)

# 10. Remove Focus Selector Modal, Edit Competition Modal, and CompetitionCard
modal_regex = r"                \{/\* Focus Selector Modal \*/\}[\s\S]*?    \);\n\}\n\nconst CompetitionCard = \(\{[\s\S]*?    \);\n\};\n\nconst styles ="
content = re.sub(modal_regex, "            </SafeAreaView>\n        </TouchableWithoutFeedback>\n    );\n}\n\nconst styles =", content)

with open('app/create-tribe.tsx', 'w') as f:
    f.write(content)

