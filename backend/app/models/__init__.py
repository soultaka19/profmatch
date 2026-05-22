from app.models.user import User, UserRole  # noqa: F401
from app.models.professeur import Professeur  # noqa: F401
from app.models.cv import CV, CVStatut  # noqa: F401
from app.models.competence import Competence, CompetenceNiveau, SourceOrigine  # noqa: F401
from app.models.experience import Experience  # noqa: F401
from app.models.formation import Formation  # noqa: F401
from app.models.langue import Langue, LangueNiveau  # noqa: F401
from app.models.programme import Programme  # noqa: F401
from app.models.etape_programme import EtapeProgramme  # noqa: F401
from app.models.cours import Cours  # noqa: F401
from app.models.cours_etape_programme import CategorieCours, CoursEtapeProgramme  # noqa: F401
from app.models.cours_competence import CoursCompetence  # noqa: F401
from app.models.session import Semestre, Session, SessionStatut  # noqa: F401
from app.models.affectation import Affectation, AffectationStatut  # noqa: F401
