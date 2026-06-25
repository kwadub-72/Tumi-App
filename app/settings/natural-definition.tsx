import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors } from '@/src/shared/theme/Colors';

export default function NaturalDefinitionScreen() {
    const router = useRouter();

    const Section = ({ title, items }: { title: string, items: { name: string, desc?: string }[] }) => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.desc && <Text style={styles.itemDesc}>{item.desc}</Text>}
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={28} color={Colors.theme.harvestGold} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chribe Natural</Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.introCard}>
                    <Text style={styles.definitionTitle}>Natural Status Definition and Eligibility</Text>
                    <Text style={styles.introText}>
                        Natural status is defined as never having used, at any point in one’s lifetime, any of the substances or therapies listed below for non-medical purposes. Applicants who can provide verifiable medical documentation demonstrating a legitimate medical need for such substances may still be considered for natural status at Chribe’s discretion.
                    </Text>
                    <Text style={styles.introText}>
                        Once approved, natural status is valid for a period of six (6) months, after which reapplication is required to maintain eligibility.
                    </Text>
                    <Text style={styles.introText}>
                        Users may be reported at any time by other community members. Reported users may be required to submit additional documentation, undergo a polygraph examination, reapply for natural status, or respond to inquiries from Chribe.
                    </Text>
                    <Text style={styles.introText}>
                        Chribe reserves the right to investigate or revoke natural status at any time and for any reason.
                    </Text>
                    <Text style={styles.introText}>
                        Chribe also reserves the right to restrict or ban users with significant followings on Chribe (defined as 100 or more followers) who claim natural status on Chribe or other social platforms (e.g., Instagram, TikTok) without having submitted a natural status application or after having been denied natural status.
                    </Text>
                </View>

                <View style={styles.substancesContainer}>
                    <Text style={styles.mainHeading}>Potentially disqualifying substances and therapies</Text>

                    <Section
                        title="Anabolic-Androgenic Steroids (AAS)"
                        items={[
                            { name: "Synthetic derivatives of testosterone", desc: "increase muscle mass & strength" },
                            { name: "Injectables", desc: "Testosterone enanthate, cypionate, propionate, Trenbolone, Deca-Durabolin, Equipoise" },
                            { name: "Orals", desc: "Dianabol, Anavar, Winstrol, Turinabol, Methyltestosterone" },
                            { name: "Other steroid derivatives", desc: "Masteron, Primobolan, Halotestin" }
                        ]}
                    />

                    <Section
                        title="Hormones"
                        items={[
                            { name: "Growth & anabolic hormones", desc: "Human Growth Hormone (HGH), IGF-1 and IGF-1 LR3, Insulin (anabolic effect), Thyroid hormones (T3 / T4)" },
                            { name: "Sex hormones", desc: "Testosterone (endogenous or exogenous), Dihydrotestosterone (DHT) derivatives" }
                        ]}
                    />

                    <Section
                        title="Erythropoietin (EPO)"
                        items={[{ name: "Performance Boost", desc: "Boosts red blood cell production → endurance" }]}
                    />

                    <Section
                        title="Selective Androgen Receptor Modulators (SARMs)"
                        items={[
                            { name: "Mechanism", desc: "Bind androgen receptors selectively → anabolic effects with fewer side effects." },
                            { name: "List", desc: "Ostarine (MK-2866), Ligandrol (LGD-4033), Andarine (S4), RAD-140 (Testolone), Cardarine (GW-501516)" }
                        ]}
                    />

                    <Section
                        title="Peptides"
                        items={[
                            { name: "Growth hormone-releasing peptides (GHRPs)", desc: "GHRP-2, GHRP-6, Ipamorelin, Hexarelin" },
                            { name: "Other anabolic peptides", desc: "IGF-1 LR3, Mechano Growth Factor (MGF)" }
                        ]}
                    />

                    <Section
                        title="Masking Agents"
                        items={[
                            { name: "Diuretics", desc: "Furosemide, Hydrochlorothiazide → dilute urine" },
                            { name: "Plasma expanders", desc: "Albumin, Dextran" },
                            { name: "Others", desc: "Probenecid, Epitestosterone" }
                        ]}
                    />

                    <Section
                        title="Other"
                        items={[
                            { name: "hCG", desc: "Human Chorionic Gonadotropin (hCG) for fat loss" },
                            { name: "Anti-estrogens", desc: "Anastrozole, Tamoxifen" }
                        ]}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.theme.charcoal,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backBtn: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 60,
    },
    introCard: {
        backgroundColor: Colors.theme.matteBlack,
        borderColor: 'rgba(218, 165, 32, 0.15)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
    },
    definitionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 15,
    },
    introText: {
        fontSize: 14,
        color: Colors.theme.softWhite,
        opacity: 0.9,
        lineHeight: 22,
        marginBottom: 15,
        textAlign: 'justify',
    },
    substancesContainer: {
        marginTop: 10,
    },
    mainHeading: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginTop: 10,
        marginBottom: 20,
        textAlign: 'center',
    },
    section: {
        marginBottom: 25,
        backgroundColor: Colors.theme.matteBlack,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.theme.harvestGold,
        marginBottom: 12,
        textDecorationLine: 'none',
    },
    itemRow: {
        marginBottom: 10,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.theme.softWhite,
    },
    itemDesc: {
        fontSize: 14,
        color: Colors.theme.dust,
        lineHeight: 20,
        marginTop: 2,
    },
});
