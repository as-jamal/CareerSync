from typing import Dict, List, Any, Tuple

class ScoringEngine:
    """
    Transparent, deterministic scoring engine for HireMind AI.
    Calculates weighted overall fit:
    - 40% Skills Match
    - 30% Experience Match
    - 15% Education Match
    - 15% Job Relevance / Specialized Fit
    """

    WEIGHT_SKILLS = 0.40
    WEIGHT_EXPERIENCE = 0.30
    WEIGHT_EDUCATION = 0.15
    WEIGHT_RELEVANCE = 0.15

    @classmethod
    def calculate_scores(
        cls,
        matching_skills: List[str],
        missing_skills: List[Any],
        ai_skills_score: int,
        ai_exp_score: int,
        ai_edu_score: int,
        ai_relevance_score: int = 80
    ) -> Dict[str, Any]:
        """
        Combines skill coverage math with AI sub-scores to yield robust, consistent metrics.
        """
        # 1. Skill Match math
        total_skills_count = len(matching_skills) + len(missing_skills)
        if total_skills_count > 0:
            skills_ratio_score = int((len(matching_skills) / total_skills_count) * 100)
            # Blend 50% keyword ratio with 50% AI nuanced skills assessment
            final_skills_score = int((skills_ratio_score * 0.5) + (cls._clamp(ai_skills_score) * 0.5))
        else:
            final_skills_score = cls._clamp(ai_skills_score)

        final_exp_score = cls._clamp(ai_exp_score)
        final_edu_score = cls._clamp(ai_edu_score)
        final_rel_score = cls._clamp(ai_relevance_score)

        # 2. Overall Weighted Formula
        raw_overall = (
            (final_skills_score * cls.WEIGHT_SKILLS) +
            (final_exp_score * cls.WEIGHT_EXPERIENCE) +
            (final_edu_score * cls.WEIGHT_EDUCATION) +
            (final_rel_score * cls.WEIGHT_RELEVANCE)
        )
        
        overall_score = int(round(raw_overall))
        match_label, status_color = cls.get_match_label(overall_score)

        return {
            "overall_match_score": overall_score,
            "match_label": match_label,
            "status_color": status_color,
            "skills_match_score": final_skills_score,
            "experience_match_score": final_exp_score,
            "education_match_score": final_edu_score,
            "relevance_match_score": final_rel_score,
            "scoring_weights": {
                "skills": "40%",
                "experience": "30%",
                "education": "15%",
                "job_relevance": "15%"
            }
        }

    @staticmethod
    def _clamp(val: Any, default: int = 70) -> int:
        try:
            val_int = int(val)
            return max(0, min(100, val_int))
        except (ValueError, TypeError):
            return default

    @staticmethod
    def get_match_label(score: int) -> Tuple[str, str]:
        if score >= 85:
            return "Strong Match", "#10b981"  # Emerald Green
        elif score >= 70:
            return "Good Match", "#3b82f6"    # Blue
        elif score >= 55:
            return "Moderate Fit", "#f59e0b"  # Amber
        elif score >= 40:
            return "Weak Match", "#ec4899"    # Pink/Rose
        else:
            return "Poor Match", "#ef4444"    # Red
